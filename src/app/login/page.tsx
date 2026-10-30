import { ArrowUpRight, Check, Sun, Zap } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceEmpty } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const needsSetup = await isWorkspaceEmpty();

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-visual" aria-label="WattPro Solar">
          <div className="login-visual-shade" />
          <div className="login-brand">
            <Image src="/images/wattpro-logo-white.png" alt="WattPro Solar Energy Pvt. Ltd." className="login-brand-logo" width={320} height={105} priority />
          </div>
          <div className="login-visual-content">
            <span className="login-kicker"><Zap size={14} fill="currentColor" /> POWERING BETTER WORKDAYS</span>
            <h2>Great work starts<br />with showing up<span className="login-dot">.</span></h2>
            <p>One simple place to track time, support your team, and keep brighter days moving forward.</p>
            <div className="login-visual-stat">
              <div className="login-stat-symbol"><Check size={22} strokeWidth={2.6} /></div>
              <div><strong>Built for the people behind the power</strong><span>Every shift counts. Every person matters.</span></div>
              <ArrowUpRight size={18} className="login-stat-arrow" />
            </div>
          </div>
          <div className="login-photo-credit">WATTPRO SOLAR &nbsp;•&nbsp; WORKFORCE PLATFORM</div>
        </section>
        <section className="login-form-side">
          <div className="login-mobile-brand">
            <Image src="/images/wattpro-logo-blue.png" alt="WattPro Solar Energy Pvt. Ltd." className="login-mobile-logo" width={200} height={66} />
          </div>
          <div className="login-form-wrap">
            <div className="login-icon"><Sun size={23} strokeWidth={2} /></div>
            <div className="login-heading">
              <span>{needsSetup ? "LET'S GET STARTED" : "WELCOME BACK"}</span>
              <h1>{needsSetup ? <>Create your<br />workspace</> : <>Sign in to your<br />workspace</>}</h1>
              <p>{needsSetup ? "Set up the first administrator account to begin tracking attendance." : "Let's pick up where you left off."}</p>
            </div>
            <LoginForm needsSetup={needsSetup} />
          </div>
          <p className="login-footer">© {new Date().getFullYear()} WattPro Solar Energy Pvt. Ltd. Made for brighter days.</p>
        </section>
      </div>
    </main>
  );
}
