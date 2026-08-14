import Link from "next/link";
import { Cap } from "@/components/engram/Cap";
import { Grain } from "@/components/engram/Grain";
import { Wordmark } from "@/components/engram/Mark";

export default function Home() {
  return (
    <main className="hero">
      <Grain />
      <div className="field" />
      <div className="hero-top">
        <div className="hero-wm">
          <Cap className="mb-[1.1rem] block">Persistent context — built on MongoDB</Cap>
          <h1>Engram</h1>
          <p className="sub">
            A reading companion that models your memory, so the agent never cold-starts you again.
          </p>
          <div className="mt-9 flex items-center justify-center gap-4">
            <Link
              href="/design"
              className="pill solid"
              style={{ textDecoration: "none", padding: ".6rem 1.2rem" }}
            >
              <span className="bit" />
              Design system
            </Link>
          </div>
        </div>
      </div>
      <div className="relative z-2 flex justify-center pb-8">
        <Wordmark size={22} />
      </div>
    </main>
  );
}
