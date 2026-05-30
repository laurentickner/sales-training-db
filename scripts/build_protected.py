"""Build password-protected single-file HTML bundles for the team-only deploy.

Inlines styles.css + data.js + app.js into a single index.html per tool, then
encrypts with staticrypt. Output goes to docs/triage/ and docs/app/, which
GitHub Pages serves from /docs/.

The source files in /triage/ and /app/ remain for local dev (run via
`python3 -m http.server 8770` and browse to those folders directly — they
load the un-encrypted dev versions).

Run:
  STATICRYPT_PASSWORD='your-password' python3 scripts/build_protected.py

Requires: npx + staticrypt (already installed via npm).
"""
import os
import re
import subprocess
import sys
import tempfile

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PASSWORD = os.environ.get("STATICRYPT_PASSWORD")
if not PASSWORD:
    sys.exit("ERROR: set STATICRYPT_PASSWORD env var before running.")


def read(rel):
    with open(os.path.join(base, rel), encoding="utf-8") as f:
        return f.read()


def inline_html(tool_dir):
    """Read tool_dir/index.html and inline its CSS + JS into one HTML string."""
    html = read(f"{tool_dir}/index.html")
    css = read(f"{tool_dir}/styles.css")
    data_js = read(f"{tool_dir}/data/data.js")
    app_js = read(f"{tool_dir}/app.js")

    # Use lambdas so re.sub treats the replacement literally — the source
    # files contain backslashes (e.g. \n inside JSON strings) which would
    # otherwise be interpreted as escape sequences.
    style_block = f"<style>\n{css}\n</style>"
    data_block = f"<script>\n{data_js}\n</script>"
    app_block = f"<script>\n{app_js}\n</script>"
    html = re.sub(
        r'<link\s+rel="stylesheet"\s+href="styles\.css[^"]*"\s*/?>',
        lambda m: style_block,
        html,
    )
    html = re.sub(
        r'<script\s+src="data/data\.js[^"]*"\s*></script>',
        lambda m: data_block,
        html,
    )
    html = re.sub(
        r'<script\s+src="app\.js[^"]*"\s*></script>',
        lambda m: app_block,
        html,
    )

    # Sanity: every linked asset should now be inlined
    for marker in ('href="styles.css', 'src="app.js', 'src="data/data.js'):
        if marker in html:
            sys.exit(f"ERROR: marker {marker!r} still present in {tool_dir} after inlining — regex miss")

    return html


def encrypt(html, out_dir, label):
    """Run staticrypt on the inlined HTML, writing to out_dir/index.html."""
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".html", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(html)
        tmp_path = tmp.name

    try:
        # Password comes from STATICRYPT_PASSWORD env var (already set by caller).
        # Not passed as -p flag to keep it out of process argv listings.
        cmd = [
            "npx", "-y", "staticrypt",
            tmp_path,
            "-d", out_dir,
            "-c", "false",                # don't write .staticrypt.json config file
            "--short",
            "--remember", "7",
            "--template-button", "Unlock",
            "--template-instructions", "Team-only. Ping Lauren if you need the password.",
        ]
        env = os.environ.copy()
        env["STATICRYPT_PASSWORD"] = PASSWORD
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if result.returncode != 0:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            sys.exit(f"staticrypt failed: exit {result.returncode}")

        # staticrypt names output after input file. Move to index.html.
        produced_name = os.path.basename(tmp_path)
        produced = os.path.join(out_dir, produced_name)
        target = os.path.join(out_dir, "index.html")
        if not os.path.exists(produced):
            # Try without .html extension if staticrypt stripped it
            produced_alt = produced.replace(".html", "") + ".html"
            if os.path.exists(produced_alt):
                produced = produced_alt
        if os.path.exists(produced):
            if os.path.exists(target):
                os.remove(target)
            os.rename(produced, target)
        else:
            sys.exit(f"ERROR: staticrypt didn't produce expected output in {out_dir}")
    finally:
        os.unlink(tmp_path)


def write_landing():
    """Tiny /docs/index.html so the root URL is friendly."""
    landing = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scale Systems — Team Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0E0A1F; color: #F4EEE2;
      min-height: 100vh; margin: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 40px;
    }
    .card {
      max-width: 540px; padding: 40px;
      background: #15102B; border: 1px solid #2D2640; border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,.4);
    }
    h1 { font-size: 22px; margin: 0 0 8px; font-weight: 800; }
    h1 span { color: #00BFF1; }
    p { color: #9F97B8; line-height: 1.55; margin: 8px 0 24px; }
    a {
      display: block; padding: 14px 18px; margin-bottom: 10px;
      background: #1C1640; border: 1px solid #2D2640; border-radius: 10px;
      color: #F4EEE2; text-decoration: none; font-weight: 600;
    }
    a:hover { background: #2A0D77; border-color: #4a2da3; }
    a span { color: #9F97B8; font-weight: 400; font-size: 13px; display: block; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Scale Systems <span>Team Tools</span></h1>
    <p>Both tools are password-gated. Ping Lauren if you need the password.</p>
    <a href="./triage/">📞 Triage / Setter Copilot
      <span>For Mariana — qualifying calls, DMs, outbound dials</span>
    </a>
    <a href="./app/">📞 Sales Call Copilot
      <span>Closer tool — the full discovery + objection-handling stack</span>
    </a>
  </div>
</body>
</html>
"""
    landing_path = os.path.join(base, "docs", "index.html")
    os.makedirs(os.path.dirname(landing_path), exist_ok=True)
    with open(landing_path, "w", encoding="utf-8") as f:
        f.write(landing)
    print(f"wrote docs/index.html (landing page)")


for tool in ["triage", "app"]:
    print(f"Building protected /docs/{tool}/...")
    html = inline_html(tool)
    out_dir = os.path.join(base, "docs", tool)
    label = "Triage Copilot" if tool == "triage" else "Sales Call Copilot"
    encrypt(html, out_dir, label)
    size = os.path.getsize(os.path.join(out_dir, "index.html"))
    print(f"  wrote docs/{tool}/index.html ({size:,} bytes, encrypted)")

write_landing()
print("done.")
