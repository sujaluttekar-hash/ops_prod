export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'badge badge-green',
    pending: 'badge badge-amber',
    overdue: 'badge badge-red',
    delayed: 'badge badge-red',
    scheduled: 'badge badge-blue',
    upcoming: 'badge badge-blue',
    planned: 'badge badge-gray',
    tbc: 'badge badge-amber',
    occupied: 'badge badge-green',
    partial: 'badge badge-amber',
    vacant: 'badge badge-gray',
  };
  return map[status] || 'badge badge-gray';
}

export function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    completed: 'Completed',
    pending: 'Pending',
    overdue: 'Overdue',
    delayed: 'Delayed',
    scheduled: 'Scheduled',
    upcoming: 'Upcoming',
    planned: 'Planned',
    tbc: 'TBC',
    occupied: 'In',
    partial: 'Partial',
    vacant: 'Vacant',
  };
  return map[status] || status;
}

export function getShiftClass(shift: string) {
  const map: Record<string, string> = {
    M: 'shift-m',
    E: 'shift-e',
    N: 'shift-n',
    Off: 'shift-off',
  };
  return map[shift] || 'shift-off';
}

export function getShiftLabel(shift: string) {
  const map: Record<string, string> = {
    M: 'Morning',
    E: 'Evening',
    N: 'Night',
    Off: 'Off',
  };
  return map[shift] || shift;
}
