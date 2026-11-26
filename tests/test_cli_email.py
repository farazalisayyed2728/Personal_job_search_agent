from types import SimpleNamespace

import pytest

from jobhunt import cli


@pytest.mark.parametrize("send_error, expected_exit", [(None, 0), (RuntimeError("SMTP error"), 1)])
def test_run_emails_digest_when_there_are_no_new_jobs(
    monkeypatch, send_error, expected_exit
):
    class EmptyStore:
        def __init__(self, _path):
            pass

        def unseen(self, jobs):
            return []

        def stats(self):
            return {}

    sent = []

    def send_email(subject, document):
        sent.append((subject, document))
        if send_error:
            raise send_error

    monkeypatch.setattr(cli, "_cfg", lambda _path: {"filters": {}})
    monkeypatch.setattr(cli, "_load_profile", lambda *_args, **_kwargs: {"name": "Test"})
    monkeypatch.setattr(cli, "Store", EmptyStore)
    monkeypatch.setattr(cli, "fetch_all_mock", lambda: [object()])
    monkeypatch.setattr(cli, "prefilter", lambda jobs, _filters: jobs)
    monkeypatch.setattr(cli.digest_mod, "build", lambda *_args: ("subject", "digest"))
    monkeypatch.setattr(cli.digest_mod, "write", lambda *_args: "digest.html")
    monkeypatch.setattr(cli.mailer, "send", send_email)

    args = SimpleNamespace(
        config="config.yaml",
        mock=True,
        scorer="keyword",
        no_draft=False,
        send=True,
        limit=None,
    )
    result = cli.cmd_run(args)

    assert result == expected_exit
    assert sent == [("subject", "digest")]
