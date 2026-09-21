import { SiteNav, Footer } from "@/components/site-nav";
import { catalog, stages, stageLabels } from "@/lib/catalog";
import { ArrowUpRight, FlaskConical, ShieldCheck } from "lucide-react";
export const metadata = { title: "The model & its limitations" };
export default function Model() {
  return (
    <>
      <SiteNav />
      <main className="container section model-page">
        <span className="eyebrow">OPEN ABOUT WHAT’S UNDER THE HOOD</span>
        <h1 className="page-title">
          Research you can inspect.
          <br />
          Limitations you should know.
        </h1>
        <p className="page-intro">
          Useful predictions start with an honest understanding of the data, the method, and what
          the results cannot tell us.
        </p>
        <div className="model-source card">
          <span className="feature-icon lime">
            <FlaskConical />
          </span>
          <div>
            <h3>UCI · Predict Students’ Dropout and Academic Success</h3>
            <p>
              4,424 records · 36 predictors · Polytechnic Institute of Portalegre, Portugal ·
              enrollment years 2008/09–2018/19 · CC BY 4.0
            </p>
            <a
              className="text-button"
              href="https://doi.org/10.24432/C5MC89"
              target="_blank"
              rel="noreferrer"
            >
              View original dataset <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <h2>Three stages. Measured performance.</h2>
        <p>
          These are held-out results for the actual packaged models—not expected accuracy at your
          institution.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Prediction stage</th>
                <th>Inputs</th>
                <th>Selected model</th>
                <th>Accuracy</th>
                <th>Macro F1</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage}>
                  <td>{stageLabels[stage]}</td>
                  <td>{catalog[stage].features.length}</td>
                  <td>{catalog[stage].estimator}</td>
                  <td>{(catalog[stage].accuracy * 100).toFixed(1)}%</td>
                  <td>{catalog[stage].macroF1.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="two-col section-small">
          <article>
            <h3>How the models were selected</h3>
            <p>
              A stratified split reserved 885 records (20%) for final testing. Logistic Regression,
              Random Forest, and Histogram-based Gradient Boosting were compared using three-fold
              cross-validation on the remaining 3,539 records.
            </p>
            <p>
              Selection used mean macro F1. One-hot encoding and numerical scaling were fitted
              within the training folds. The selected pipelines were fitted on the training
              partition only; test records were never fitted. Random seed: 42.
            </p>
          </article>
          <article>
            <h3>What the outcomes mean</h3>
            <p>
              <strong>Dropout:</strong> the source dataset’s dropout classification, which includes
              changes of course or institution.
            </p>
            <p>
              <strong>Enrolled:</strong> still enrolled at the end of the normal course duration.
            </p>
            <p>
              <strong>Graduate:</strong> completed by the end of the normal course duration. These
              are inherited dataset labels, not new grade thresholds.
            </p>
          </article>
        </div>
        <div className="notice limitation">
          <ShieldCheck />
          <div>
            <h3>Not a validated institutional screening system</h3>
            <p>
              Probabilities are uncalibrated estimates. No external, temporal, University of
              Liberia, or other local validation has been performed. Sensitive demographic and
              socioeconomic attributes are included; subgroup fairness has not been audited.
            </p>
            <p>
              Later stages require completed semester results. Financial-status timestamps should be
              verified locally. Daytime/evening attendance is a schedule, not a measure of
              attendance frequency. The model does not use LMS logs or assignment-completion data.
            </p>
            <p>
              Use human review. Never use these predictions alone to deny admission, funding, or
              support. No retention improvement or intervention benefit has been demonstrated.
            </p>
          </div>
        </div>
        <h3>Source attribution</h3>
        <p>
          Realinho, V., Machado, J., Baptista, L., & Martins, M. V. (2022). Predicting Student
          Dropout and Academic Success. <em>Data, 7</em>(11), 146.{" "}
          <a href="https://doi.org/10.3390/data7110146">doi:10.3390/data7110146</a>. Dataset DOI:{" "}
          <a href="https://doi.org/10.24432/C5MC89">10.24432/C5MC89</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
