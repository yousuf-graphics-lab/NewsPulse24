import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Pencil,
  Clock4,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  IconButton,
  MicroLabel,
  SectionHead,
  Select,
  Tag,
  TextInput,
  cx,
} from './ui';
import { CATEGORIES } from '../../data/news';
import { removeStaff, staffList, upsertStaff } from '../../lib/contentStore';
import { logEvent, read as readDb } from '../../lib/db';

const ROLES = ['Editor in chief', 'Editor', 'Correspondent', 'Producer', 'Photographer', 'Analyst'];

const blank = () => ({
  id: `staff-${Date.now().toString(36)}`,
  name: '',
  role: 'Correspondent',
  initials: '',
  desk: 'World',
  access: 'Correspondent',
  shift: 'London · 06:00–14:00',
  active: true,
});

export default function StaffView({ version, notify }) {
  const [draft, setDraft] = useState(null);
  const staff = useMemo(() => staffList(), [version]);
  const shifts = useMemo(() => {
    const map = new Map();
    for (const member of staff) {
      const [city, window] = String(member.shift || 'Unassigned · 00:00–00:00').split('·').map((part) => part.trim());
      const match = window?.match(/(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})/);
      const start = match ? Number(match[1]) + Number(match[2]) / 60 : 0;
      const end = match ? Number(match[3]) + Number(match[4]) / 60 : 0;
      const key = `${city}|${window}`;
      const entry = map.get(key) || { city, label: window, start, end, seats: 0 };
      entry.seats += 1;
      map.set(key, entry);
    }
    return [...map.values()].map((entry) => {
      const duration = entry.end > entry.start ? entry.end - entry.start : 24 - entry.start + entry.end;
      return {
        ...entry,
        segments: [
          { left: (entry.start / 24) * 100, width: (Math.min(duration, 24 - entry.start) / 24) * 100 },
          ...(entry.start + duration > 24
            ? [{ left: 0, width: ((degree) => degree / 24 * 100)(entry.start + duration - 24) }]
            : []),
        ],
      };
    });
  }, [staff]);

  const rosterEvents = useMemo(
    () => readDb().audit.filter((entry) => /staff|roster/i.test(entry.action)),
    [version],
  );

  const save = () => {
    if (!draft) return;
    if (draft.name.trim().length < 3) {
      notify('Add a name before saving the seat', 'error');
      return;
    }
    const record = {
      ...draft,
      name: draft.name.trim(),
      initials:
        draft.initials.trim() ||
        draft.name
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
    };
    upsertStaff(record);
    logEvent('security', staff.some((item) => item.id === record.id) ? 'Staff seat updated' : 'Staff seat added', record.name);
    setDraft(null);
    notify('Roster updated', 'success');
  };

  const remove = (member) => {
    if (!window.confirm(`Remove ${member.name} from the roster?`)) return;
    removeStaff(member.id);
    logEvent('security', 'Staff seat removed', member.name);
    notify('Seat removed from the roster', 'success');
  };

  const toggleActive = (member) => {
    upsertStaff({ ...member, active: !member.active });
    logEvent('security', member.active ? 'Staff seat suspended' : 'Staff seat reactivated', member.name);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Roster & desk permissions"
            description="Who can file to which desk. Seeded from the newsroom directory on first open."
            action={
              <div className="flex items-center gap-1.5">
                <Tag tone="green">{staff.filter((item) => item.active).length} active</Tag>
                <Button variant="ghost" size="sm" onClick={() => setDraft(blank())}>
                  <UserPlus className="h-3 w-3" /> Add seat
                </Button>
              </div>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1D1E25] text-[8.5px] uppercase tracking-[0.14em] text-[#6F7180]">
                  <th className="px-3.5 py-1.5 font-bold">Name</th>
                  <th className="px-2 py-1.5 font-bold">Desk</th>
                  <th className="px-2 py-1.5 font-bold">Access</th>
                  <th className="px-2 py-1.5 font-bold">Shift</th>
                  <th className="px-3 py-1.5 text-right font-bold">State</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-[#1B1C22] last:border-b-0">
                    <td className="px-3.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[8px] font-bold',
                            member.active
                              ? 'border-[#2A2C36] bg-[#15161C] text-pulse'
                              : 'border-[#22232A] bg-[#101116] text-[#5F616E]',
                          )}
                        >
                          {member.initials}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDraft(member)}
                            className="block max-w-[180px] truncate text-left text-[11px] font-semibold text-bone/90 hover:text-white"
                          >
                            {member.name}
                          </button>
                          <p className="truncate text-[9px] text-[#6F7180]">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[10.5px] text-[#9A9CAA]">{member.desk}</td>
                    <td className="px-2 py-1.5">
                      <Tag tone={member.access === 'Editor in chief' ? 'red' : member.access === 'Editor' ? 'amber' : 'muted'}>
                        {member.access}
                      </Tag>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[9px] text-[#7A7C89]">{member.shift}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleActive(member)}
                          className={cx(
                            'rounded-[3px] border px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-[0.1em] transition-colors',
                            member.active
                              ? 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-300/90'
                              : 'border-[#2A2C36] text-[#7A7C89] hover:text-bone',
                          )}
                        >
                          {member.active ? 'Active' : 'Suspended'}
                        </button>
                        <IconButton label={`Edit ${member.name}`} onClick={() => setDraft(member)} className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </IconButton>
                        <IconButton
                          label={`Remove ${member.name}`}
                          onClick={() => remove(member)}
                          className="h-6 w-6 hover:text-pulse"
                        >
                          <Trash2 className="h-3 w-3" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!staff.length ? (
                  <tr>
                    <td colSpan={5} className="px-3.5 py-4 text-[10.5px] text-[#6F7180]">
                      Every seat has been removed — add one to rebuild the roster.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <SectionHead
              title={draft ? 'Seat details' : 'Access model'}
              action={draft ? <Tag tone="red">Editing</Tag> : null}
            />
            {draft ? (
              <div className="space-y-2.5 px-3.5 py-3">
                <Field label="Name" htmlFor="staff-name">
                  <TextInput
                    id="staff-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="Full name"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Initials" htmlFor="staff-initials">
                    <TextInput
                      id="staff-initials"
                      value={draft.initials}
                      maxLength={2}
                      onChange={(event) => setDraft({ ...draft, initials: event.target.value.toUpperCase() })}
                      placeholder="Auto"
                    />
                  </Field>
                  <Field label="Desk" htmlFor="staff-desk">
                    <Select
                      id="staff-desk"
                      value={draft.desk}
                      onChange={(event) => setDraft({ ...draft, desk: event.target.value })}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Title" htmlFor="staff-role">
                    <Select
                      id="staff-role"
                      value={draft.role}
                      onChange={(event) => setDraft({ ...draft, role: event.target.value })}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Access" htmlFor="staff-access">
                    <Select
                      id="staff-access"
                      value={draft.access}
                      onChange={(event) => setDraft({ ...draft, access: event.target.value })}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Shift" htmlFor="staff-shift">
                  <TextInput
                    id="staff-shift"
                    value={draft.shift}
                    onChange={(event) => setDraft({ ...draft, shift: event.target.value })}
                    placeholder="London · 06:00–14:00"
                  />
                </Field>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="primary" size="md" onClick={save}>
                    <Plus className="h-3.5 w-3.5" /> Save seat
                  </Button>
                  <Button variant="quiet" size="md" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 px-3.5 py-3">
                {[
                  [ShieldCheck, 'Editor in chief', 'Full control: publish, override, rotate the passphrase, reset the database.'],
                  [BadgeCheck, 'Editor', 'Publish and unpublish stories, pin slots, transmit broadcast notes.'],
                  [KeyRound, 'Correspondent', 'Write and save drafts; publishing needs an editor.'],
                  [Clock4, 'Producer', 'Owns the live desk rundown and ticker order.'],
                ].map(([Icon, role, detail]) => (
                  <div key={role} className="flex items-start gap-2">
                    <Icon className="mt-[1px] h-3 w-3 shrink-0 text-pulse/80" />
                    <div>
                      <p className="text-[10.5px] font-semibold text-bone/85">{role}</p>
                      <p className="text-[9.5px] leading-snug text-[#6F7180]">{detail}</p>
                    </div>
                  </div>
                ))}
                <p className="flex items-start gap-1.5 rounded-[3px] border border-[#262832] bg-[#0A0B0F] px-2 py-1.5 text-[9px] leading-snug text-[#7A7C89]">
                  <Users className="mt-[1px] h-3 w-3 shrink-0" />
                  This panel gates the local browser only. Seat rows are part of the database and travel
                  with an export.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <SectionHead title="Roster activity" action={<MicroLabel>{rosterEvents.length} recent</MicroLabel>} />
            <ul className="divide-y divide-[#1B1C22]">
              {rosterEvents.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 px-3.5 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px] font-semibold text-bone/85">{entry.action}</span>
                    <span className="block truncate text-[9px] text-[#6F7180]">{entry.detail}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[8.5px] text-[#5F616E]">
                    {new Date(entry.at).toLocaleTimeString('en-GB', { hour12: false })}
                  </span>
                </li>
              ))}
              {!rosterEvents.length ? (
                <li className="px-3.5 py-3 text-[9.5px] text-[#6F7180]">
                  Seat changes appear here as you edit the roster.
                </li>
              ) : null}
            </ul>
          </Card>

          <Card className="px-3.5 py-3">
            <MicroLabel tone="bright">Coverage today</MicroLabel>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                ['Seats', staff.length],
                ['Active', staff.filter((item) => item.active).length],
                ['Desks', new Set(staff.map((item) => item.desk)).size],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#5F616E]">{label}</p>
                  <p className="mt-0.5 text-[13px] font-bold text-bone/90">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <SectionHead
          title="Shift coverage"
          description="Where the roster is awake through the 24-hour cycle. Bars are the published shift windows."
          action={<MicroLabel>UTC</MicroLabel>}
        />
        <div className="px-3.5 py-3">
          <div className="mb-1 flex pl-[104px]">
            {Array.from({ length: 25 }, (_, hour) => (
              <span key={hour} className="flex-1 text-center font-mono text-[7.5px] text-[#5F616E]">
                {hour % 4 === 0 ? String(hour % 24).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
          {shifts.map((shift) => (
            <div key={shift.city} className="mb-1.5 flex items-center">
              <span className="w-[104px] shrink-0 pr-2 text-[10px] text-[#9A9CAA]">
                {shift.city}
                <span className="ml-1 text-[8.5px] text-[#5F616E]">{shift.seats}</span>
              </span>
              <span className="relative h-3 flex-1 rounded-[2px] bg-[#14151B]">
                {Array.from({ length: 24 }, (_, hour) => (
                  <span
                    key={hour}
                    className="absolute top-0 h-full w-px bg-[#1D1E25]"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  />
                ))}
                {shift.segments.map((segment, index) => (
                  <span
                    key={index}
                    title={`${shift.city} ${shift.label}`}
                    className="absolute top-0 h-full rounded-[2px] bg-gradient-to-r from-pulse/60 to-pulse"
                    style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                  />
                ))}
              </span>
            </div>
          ))}
          <p className="mt-1 pl-[104px] text-[9px] leading-snug text-[#5F616E]">
            {staff.filter((item) => item.active).length} active seats across {shifts.length} shift windows.
            Suspended seats keep their shift but stop filing.
          </p>
        </div>
      </Card>
    </div>
  );
}
