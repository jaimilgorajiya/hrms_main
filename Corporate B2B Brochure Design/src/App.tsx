import type { ReactNode } from "react";
import logo from "./imports/iipl-horizontal-logo.png";
import heroScreenshot from "./imports/for-hero.png";

type IconName =
  | "location"
  | "payroll"
  | "leave"
  | "whatsapp"
  | "shift"
  | "onboarding";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    location: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    payroll: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M7 15h3M15.5 13v4M14 14.5h3" />
      </>
    ),
    leave: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h6" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5a8 8 0 0 1-11.8 7l-4.2 1 1.1-4A8 8 0 1 1 20 11.5Z" />
        <path d="M8.4 8.2c.4 3 2.1 4.8 5.3 5.5l1.2-1.3 2 .9c-.2 1.3-1.2 2.1-2.6 2.1-3.7 0-7.7-3.8-7.7-7.5 0-1.3.7-2.3 1.9-2.6l1.1 1.9-1.2 1Z" />
      </>
    ),
    shift: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3.5 2M18.5 5.5 20 4M5.5 5.5 4 4" />
      </>
    ),
    onboarding: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M17 10v7M13.5 13.5h7" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Dashboard() {
  return (
    <div className="browser" aria-label="Iflora HRMS admin dashboard preview">
      <div className="browser-bar">
        <div className="window-dots"><i /><i /><i /></div>
        <span>Admin Dashboard — Iflora HRMS</span>
        <b>•••</b>
      </div>
      <div className="screen">
        <img src={heroScreenshot} alt="Iflora HRMS Admin Dashboard" />
      </div>
    </div>
  );
}

const features: { icon: IconName; title: string; copy: string }[] = [
  {
    icon: "location",
    title: "Attendance & Location",
    copy: "Track daily attendance with location-based punch-in and configurable attendance rules.",
  },
  {
    icon: "payroll",
    title: "Payroll & Payslips",
    copy: "Simplify salary calculations, adjustments and PDF payslip generation.",
  },
  {
    icon: "leave",
    title: "Leave Management",
    copy: "Manage leave requests, balances, policies and approvals in one place.",
  },
  {
    icon: "whatsapp",
    title: "WhatsApp Self-Service",
    copy: "Let employees access supported HR actions through familiar WhatsApp conversations.",
  },
  {
    icon: "shift",
    title: "Shifts & Attendance Rules",
    copy: "Configure shifts, grace periods and attendance-linked deductions.",
  },
  {
    icon: "onboarding",
    title: "Onboarding & Offboarding",
    copy: "Organise employee checklists, documents and joining-to-exit workflows.",
  },
];

export default function App() {
  return (
    <div className="stage">
      <article className="brochure">
        <header className="header">
          <div className="brand-lockup">
            <div className="logo-crop"><img src={logo} alt="Iflora Info Private Limited logo" /></div>
            <div className="brand-rule" />
            <div>
              <h2>Iflora HRMS</h2>
              <p>Human Resource Management System</p>
            </div>
          </div>
          <div className="header-note">Enterprise HR software<br />for Indian businesses</div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="brand-tag">Iflora Info Private Limited</p>
            <h1>Your people.<br />Your processes.<br />Perfectly connected.</h1>
            <p className="intro">Bring attendance, payroll, leave and employee workflows together in one organised workspace.</p>
            <div className="micro-proof"><span>One platform</span><i /><span>Every workday</span></div>
          </div>
          <div className="mockup-wrap">
            <Dashboard />
            <p className="caption">A clearer view of your everyday HR operations.</p>
          </div>
        </section>

        <section className="features">
          <div className="section-heading">
            <p>Built around your team</p>
            <h2>Everything your HR team needs to move forward.</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <div className="feature" key={feature.title}>
                <div className="feature-icon"><Icon name={feature.icon} /></div>
                <div>
                  <div className="feature-title"><span>0{index + 1}</span><h3>{feature.title}</h3></div>
                  <p>{feature.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="contact-line">
          <div>
            <strong>Iflora Info Private Limited</strong>
            <span>Human resources, thoughtfully connected.</span>
          </div>
          <p>www.iflorainfo.com <i>·</i> iflorainfopvtltd@gmail.com <i>·</i> +91 90997 05065</p>
        </footer>
      </article>
    </div>
  );
}

