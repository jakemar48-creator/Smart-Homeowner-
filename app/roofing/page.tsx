import StartPage from '../start/page';

// The generic roofing funnel is the reusable, contractor-neutral entry point.
// Partner routes (for example, /olympus) retain their own routing and webhook.
export default function RoofingPage() { return <StartPage basePreview />; }
