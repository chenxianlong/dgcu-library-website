import { getDatabase, nowIso } from './db';

export type ServiceHoursStatus = 'normal' | 'special' | 'closed';

export interface ServiceHoursSetting {
  display: string;
  status: ServiceHoursStatus;
  statusText: string;
  note: string;
  detailUrl: string;
}

const defaults: ServiceHoursSetting = {
  display: '08:30–23:00',
  status: 'normal',
  statusText: '正常开放',
  note: '服务地点：图书馆各服务区域',
  detailUrl: '/news/',
};

export function getServiceHours(): ServiceHoursSetting {
  const rows = getDatabase().prepare(`
    SELECT key, value FROM site_settings WHERE key LIKE 'service_hours_%'
  `).all() as Array<{ key: string; value: string }>;
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const status = ['normal', 'special', 'closed'].includes(values.service_hours_status)
    ? values.service_hours_status as ServiceHoursStatus
    : defaults.status;
  return {
    display: values.service_hours_display || defaults.display,
    status,
    statusText: values.service_hours_status_text || defaults.statusText,
    note: values.service_hours_note || defaults.note,
    detailUrl: values.service_hours_detail_url || defaults.detailUrl,
  };
}

export function saveServiceHours(setting: ServiceHoursSetting) {
  const statement = getDatabase().prepare(`
    INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const updatedAt = nowIso();
  const values: Array<[string, string]> = [
    ['service_hours_display', setting.display],
    ['service_hours_status', setting.status],
    ['service_hours_status_text', setting.statusText],
    ['service_hours_note', setting.note],
    ['service_hours_detail_url', setting.detailUrl],
  ];
  getDatabase().exec('BEGIN');
  try {
    for (const [key, value] of values) statement.run(key, value, updatedAt);
    getDatabase().exec('COMMIT');
  } catch (error) {
    getDatabase().exec('ROLLBACK');
    throw error;
  }
}
