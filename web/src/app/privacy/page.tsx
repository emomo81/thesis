import { SiteNav, Footer } from "@/components/site-nav";
export const metadata = { title: "Privacy & responsible use" };
export default function Privacy() {
  return (
    <>
      <SiteNav />
      <main className="container narrow section prose">
        <span className="eyebrow">PEOPLE AND PRIVACY FIRST</span>
        <h1 className="page-title">
          A clear approach
          <br />
          to your information.
        </h1>
        <p>
          This describes the implemented prototype. The organization deploying it is responsible for
          its legal basis, privacy notice, regional hosting choices, retention policy, and support
          contact before real student data is used.
        </p>
        <h2>Account information</h2>
        <p>
          Email, password authentication, and your display name are handled by Supabase
          Authentication. Application code does not store plaintext passwords. Secure authentication
          cookies maintain your session.
        </p>
        <h2>Student information</h2>
        <p>
          Profiles are sent over the website’s protected server route to the private model API for
          inference. Avoid names, student numbers, and other direct identifiers. Input records are
          processed in memory and are not intentionally written to the application database or
          application logs.
        </p>
        <h2>Saved prediction results</h2>
        <p>
          Saving is optional and off by default. When enabled, your account stores the stage, model
          version, date, row count, warnings, and outcome probabilities. Raw input profiles are not
          included. Row-level security limits access to the owner. Results remain until you delete
          them in History or your account is removed by the operator. Hosting providers may maintain
          backups and infrastructure logs under their own policies.
        </p>
        <h2>Processing providers</h2>
        <p>
          The deployment architecture uses Vercel for the website, Render for model inference, and
          Supabase for authentication and PostgreSQL. Region selection and institutional
          authorization must be reviewed by the deploying organization. No third-party advertising
          or analytics scripts are included.
        </p>
        <h2>Responsible-use terms</h2>
        <p>
          By creating an account, you agree to use only information you are authorized to process
          and to treat outputs as research estimates requiring human review. Do not use these
          estimates alone for admission, funding, exclusion, or access to support. No real-world
          benefit or suitability for a particular institution is guaranteed.
        </p>
        <h2>Data requests</h2>
        <p>
          You can download or delete your saved results in History. For account deletion or other
          privacy requests, contact the administrator of your deployment through their published
          institutional contact. An operator must publish that contact before public registration is
          opened.
        </p>
      </main>
      <Footer />
    </>
  );
}
