/**
 * Data-driven adaptation of the supplied brutalist Bento Dashboard template.
 * Charts and colors keep its bar/radar/donut language, but NEVER use placeholder
 * traffic/CPU figures in production: every value comes from the manager API.
 */
import { AnalyticsBento } from '../manager/BentoAnalytics';
import type { Analytics } from '../manager/analytics-types';

export default function BentoDashboard({ data }: { data: Analytics }) {
  return <AnalyticsBento analytics={data} />;
}
