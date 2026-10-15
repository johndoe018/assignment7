# Publish the site

The build is a static site. There are no API secrets to enter.

## GitHub Pages (recommended for this repository)

1. Ensure `johndoe018/assignment7` is public for the source-code submission.
2. In the repository, open **Settings → Pages**. Under **Build and deployment**,
   choose **GitHub Actions** as the source.
3. Push the source to `main`, or run **Deploy Levelly to GitHub Pages** from
   the Actions tab. The included workflow installs locked dependencies, runs
   the math and desktop/mobile tests, builds, and deploys the `dist` directory.
4. Wait for the `deploy` job to succeed. Use the URL shown by that job.
5. Open the public site, check all three levels, open the PDF report, then load
   the real AI model and ask a question. Record a successful model-selected hint
   before claiming end-to-end AI validation.

The anticipated Pages address is `https://johndoe018.github.io/assignment7/`.
It must not be submitted as a working live link until the deployment succeeds.
Relative Vite asset paths support the `/assignment7/` subdirectory.

## Netlify

Import this repository into your Netlify account. `netlify.toml` sets the build
command and `dist` output directory. Alternatively, upload the **contents** of
a completed `dist` build to Netlify Drop. A published site must use HTTPS.

## Vercel

Import the repository into your Vercel account. The included `vercel.json`
specifies a locked dependency install and Vite build. No environment secret
is required. Choose the URL shown after a successful deployment.

## Cloud environment access

Package registries already work. During preparation, the environment returned
access-denied responses for `api.github.com` and `huggingface.co`. The required
domain additions were saved to the environment configuration draft:

```text
api.github.com
johndoe018.github.io
huggingface.co
hf.co
cdn-lfs.huggingface.co
cdn-lfs-us-1.hf.co
cas-bridge.xethub.hf.co
```

Review/save the network changes in environment settings, then publish the
environment when its setup is complete. Draft saving alone does not apply
network permissions or publish this website. Hugging Face may use an additional
download hostname; diagnose the exact blocked redirect before adding one.
No new GitHub personal token is assumed necessary: native Git already uses
the platform's existing authentication route.
