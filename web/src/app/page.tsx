import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Layers3,
  ChartNoAxesCombined,
  FileSpreadsheet,
  Check,
  CirclePlay,
  BookOpen,
  Fingerprint,
  ScanLine,
} from "lucide-react";
import { SiteNav, Footer } from "@/components/site-nav";
import { Probabilities } from "@/components/probabilities";
import examples from "@/lib/demo-results.json";
export default function Home() {
  const sample = examples[0];
  return (
    <>
      <SiteNav />
      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-spark">
                <Sparkles size={13} />
              </span>{" "}
              STUDENT INSIGHT, WITH PERSPECTIVE
            </div>
            <h1>
              A clearer view.
              <br />A more informed
              <br />
              <span className="highlight">next step.</span>
            </h1>
            <p>
              Turn student information into thoughtful academic outcome predictions. One workspace
              to explore possibilities—and keep people at the center.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="button button-dark">
                Create your workspace <ArrowUpRight size={18} />
              </Link>
              <Link href="/demo" className="text-button">
                <CirclePlay size={20} /> Explore the demo
              </Link>
            </div>
            <div className="hero-footnotes">
              <span>
                <Check size={15} /> Pre-trained models
              </span>
              <span>
                <Check size={15} /> No coding required
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-note">
              <span className="icon-lime">
                <ScanLine size={19} />
              </span>
              <div>
                <strong>Insight, not a verdict.</strong>
                <small>Designed for human review</small>
              </div>
            </div>
            <div className="product-card">
              <div className="product-top">
                <span className="mini-logo">
                  <GraduationMark />
                </span>
                <span>Student overview</span>
                <span className="live-pill">SAMPLE</span>
              </div>
              <div className="sample-profile">
                <div className="profile-icon">A</div>
                <div>
                  <h3>Example student</h3>
                  <p>Synthetic profile · Second semester</p>
                </div>
                <span className="check-circle">
                  <Check size={16} />
                </span>
              </div>
              <div className="insight-label">PREDICTED ACADEMIC OUTCOME</div>
              <div className="outcome-title">
                <h2>{sample.outcome}</h2>
                <span className="subtle-pill">Model estimate</span>
              </div>
              <Probabilities probabilities={sample.probabilities} />
              <div className="sample-academics">
                <div>
                  <span>Units approved</span>
                  <strong>
                    6 <small>/ 6</small>
                  </strong>
                </div>
                <div>
                  <span>Semester grade</span>
                  <strong>
                    14.5 <small>/ 20</small>
                  </strong>
                </div>
                <div className="mini-bars">
                  {[30, 45, 37, 60, 56, 76, 70, 91].map((v, i) => (
                    <i key={i} style={{ height: `${v}%` }} />
                  ))}
                </div>
              </div>
              <div className="product-bottom">
                <ShieldCheck size={15} /> Research model · Always review in context
              </div>
            </div>
            <div className="floating-model">
              <span>
                <Layers3 size={18} />
              </span>
              <div>
                <strong>Right data. Right stage.</strong>
                <small>3 prediction stages available</small>
              </div>
            </div>
            <div className="decor-plus">✳</div>
          </div>
        </section>
        <section className="proof-strip">
          <div className="container proof-inner">
            <p>
              Grounded in research.
              <br />
              <strong>Built for practical exploration.</strong>
            </p>
            <div>
              <strong>4,424</strong>
              <span>benchmark student records</span>
            </div>
            <div>
              <strong>36</strong>
              <span>documented input features</span>
            </div>
            <div>
              <strong>3</strong>
              <span>academic outcome classes</span>
            </div>
            <a href="/model">
              Meet the model <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section className="section container" id="features">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A WORKSPACE THAT MAKES SENSE</span>
              <h2>
                Less complexity.
                <br />
                More room for understanding.
              </h2>
            </div>
            <p>
              From a single profile to a full CSV, everything you need to explore predictions in one
              place.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon lavender">
                <ChartNoAxesCombined />
              </span>
              <h3>See the whole prediction</h3>
              <p>
                View estimates for Dropout, Enrolled, and Graduate—not just a label. Understand
                uncertainty before deciding what comes next.
              </p>
              <Link href="/demo">
                Explore an example <ArrowRight size={17} />
              </Link>
            </article>
            <article className="feature-card">
              <span className="feature-icon lime">
                <FileSpreadsheet />
              </span>
              <h3>One student or a full batch</h3>
              <p>
                Use guided forms or upload a CSV of up to 250 profiles. Clear validation helps you
                catch missing information before prediction.
              </p>
              <Link href="/signup">
                Start a prediction <ArrowRight size={17} />
              </Link>
            </article>
            <article className="feature-card">
              <span className="feature-icon peach">
                <Fingerprint />
              </span>
              <h3>Your own private workspace</h3>
              <p>
                Sign in to save prediction results, revisit your history, and download CSV reports.
                Raw student profiles are not stored in history.
              </p>
              <Link href="/privacy">
                How we handle data <ArrowRight size={17} />
              </Link>
            </article>
          </div>
        </section>
        <section className="workflow-section" id="how-it-works">
          <div className="container">
            <span className="eyebrow">FROM INFORMATION TO INSIGHT</span>
            <h2>Three steps. One clearer picture.</h2>
            <div className="steps">
              <article>
                <span>01</span>
                <h3>Choose the right stage</h3>
                <p>
                  At enrollment, after the first semester, or after the second. Use only information
                  already available.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>Add a student profile</h3>
                <p>
                  Review the guided inputs or upload a stage-specific CSV. Your packaged model is
                  already trained.
                </p>
              </article>
              <article>
                <span>03</span>
                <h3>Review with context</h3>
                <p>
                  Explore probabilities, download results, and use your professional judgment—not a
                  model alone.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="section container">
          <div className="responsible-card">
            <div className="responsible-art">
              <BookOpen size={56} strokeWidth={1.2} />
              <span>
                People first.
                <br />
                Predictions second.
              </span>
            </div>
            <div>
              <span className="eyebrow">TRANSPARENCY BY DESIGN</span>
              <h2>
                A useful perspective.
                <br />
                Not the final word.
              </h2>
              <p>
                Academa uses a public dataset from one Portuguese institution. Its predictions are
                research estimates, not guarantees—and have not been validated for your institution.
              </p>
              <p className="fine-print">
                Never use these outputs alone to deny admission, funding, or student support.
              </p>
              <Link href="/model" className="text-button">
                Read the model & limitations <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>
        <section className="cta-section container">
          <span className="eyebrow">YOUR NEXT STEP STARTS HERE</span>
          <h2>
            Bring a little more clarity
            <br />
            to the conversation.
          </h2>
          <Link href="/signup" className="button button-lime">
            Create an account <ArrowUpRight size={18} />
          </Link>
          <Link href="/demo" className="cta-secondary">
            Or take a look around first →
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
function GraduationMark() {
  return <Layers3 size={17} />;
}
