import { createRoofingLeadHandler } from '../../../lib/roofing-lead-handler';
import { createRoofingLeadStore } from '../../../lib/roofing-lead-store';

export const POST = createRoofingLeadHandler(fetch, createRoofingLeadStore());
