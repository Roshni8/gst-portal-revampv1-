import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <><div className="gst-prototype-banner" role="note"><div className="gst-prototype-banner-track"><p className="gst-prototype-banner-message">BUILD WHAT MOVES INDIAN HACKATHON BY VARUN MAYA AND TEAM | THIS IS A PROTOTYPE <strong>Not affiliated with GSTN or the Government of India.</strong></p><p className="gst-prototype-banner-message" aria-hidden="true">BUILD WHAT MOVES INDIAN HACKATHON BY VARUN MAYA AND TEAM | THIS IS A PROTOTYPE <strong>Not affiliated with GSTN or the Government of India.</strong></p></div></div><main id="main-content" className="mx-auto grid w-full max-w-md flex-1 content-center gap-6 px-6 pb-8"><div><h1 className="text-2xl font-semibold">Login</h1><p className="mt-2 text-sm text-text-muted">Please enter your username and password for demo.</p></div><LoginForm /></main></>;
}
