import MeetingPage from "@/pages/MeetingPage";

/**
 * Single-page app. The page parses room name + JWT from the URL —
 * no client-side router is needed for this surface. If we add
 * lobby / settings / post-meeting pages later, drop in
 * react-router-dom and split routes here.
 */
export default function App() {
  return <MeetingPage />;
}
