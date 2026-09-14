from pathlib import Path
from unittest.mock import patch

from sklearn.linear_model import LogisticRegression
from streamlit.testing.v1 import AppTest

ROOT = Path(__file__).resolve().parents[1]


def test_dashboard_prediction_stages_without_data_or_training():
    original = Path.read_bytes
    def no_data_read(path):
        assert "data" not in path.parts, "Dashboard must not read training data"
        return original(path)
    with patch.object(LogisticRegression, "fit", side_effect=AssertionError("No runtime training")), \
         patch.object(Path, "read_bytes", no_data_read):
        at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=30).run()
        assert not at.exception
        assert len(at.sidebar.selectbox) == 1
        assert not at.sidebar.radio
        at.button[0].click().run()
        assert any("review" in error.value.lower() for error in at.error)
        for stage in ("enrollment", "semester1", "semester2"):
            at.sidebar.selectbox[0].set_value(stage).run()
            assert not at.exception
            at.checkbox[0].check()
            at.button[0].click().run()
            assert not at.exception
            assert not at.error
            assert len(at.metric) == 3
            assert any("Predicted outcome:" in title.value for title in at.subheader)
            # An unrelated rerun must retain the last submitted result/download.
            at.run()
            assert len(at.metric) == 3


def test_missing_package_fails_without_traceback():
    with patch("dashboard.inference.load_manifest", side_effect=RuntimeError("Restore artifacts/")):
        at = AppTest.from_file(str(ROOT / "app.py")).run()
        assert not at.exception
        assert "Restore artifacts/" in at.error[0].value
        assert not at.button


def test_batch_upload_predict_download_and_replace():
    import io
    import pandas as pd
    from dashboard.inference import load_manifest, template
    info = load_manifest()["models"]["enrollment"]
    frame = pd.concat([template(info)] * 2, ignore_index=True)
    uploaded = io.BytesIO(frame.to_csv(index=False).encode())
    with patch("streamlit.file_uploader", return_value=uploaded):
        at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=30).run()
        next(b for b in at.button if b.label == "Predict uploaded students").click().run()
        assert not at.exception
        assert not at.error
        assert any("2 students scored" in s.value for s in at.success)
        assert any(el.proto.label == "Download predictions (CSV)" for el in at.get("download_button"))
        # A rerun retains results; changing the upload clears old results.
        at.run()
        assert any("2 students scored" in s.value for s in at.success)
    bad_upload = io.BytesIO(b"Age at enrollment,Course\n19,33\n")
    with patch("streamlit.file_uploader", return_value=bad_upload):
        at.run()
        assert not any("students scored" in s.value for s in at.success)
        next(b for b in at.button if b.label == "Predict uploaded students").click().run()
        assert not at.exception
        assert any("Missing required columns" in e.value for e in at.error)
        assert not any(el.proto.label == "Download predictions (CSV)" for el in at.get("download_button"))
