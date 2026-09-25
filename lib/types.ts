export type Service = 'Roofing' | 'Windows' | 'Siding';

export type Contractor = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  ghlLocationId?: string;
  ghlWebhookUrl?: string;
};

export type ServiceArea = {
  contractorId: string;
  zipCode: string;
  service: Service;
  active: boolean;
};

export type LeadAnswer = { field: string; value: string };

export type WebhookPayload = {
  homeowner: string;
  roof_condition?: string;
  roof_age?: string;
  timeline: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  street_address: string;
  city: string;
  zip_code: string;
  window_intent?: string;
  window_quantity?: string;
  siding_condition?: string;
  siding_scope?: string;
  selected_services: string;
  fbclid: string;
};

export type GhlWebhookPayload = WebhookPayload & {
  lead_id: string;
  partner: string;
  contractor: string;
  selected_service_names: string;
  submitted_at: string;
  smart_homeowner: {
    lead_id: string;
    partner: string;
    contractor: string;
    selected_services: Service[];
    attribution: Attribution;
  };
};

export type Lead = {
  id: string;
  partner: string;
  contractorId: string;
  zipCode: string;
  selectedServices: Service[];
  answers: LeadAnswer[];
  status: 'received' | 'delivery_failed' | 'delivered';
  deliveryStatus: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
};

export type Attribution = Partial<Record<'fbclid' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'meta_campaign_id' | 'meta_adset_id' | 'meta_ad_id', string>>;
