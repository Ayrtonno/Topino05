const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist-ts", "renderer");
const rendererRoot = path.join(rootDir, "src", "renderer");
const pagesDir = path.join(rendererRoot, "pages");
const stylesDir = path.join(rendererRoot, "styles");
const scriptsDir = path.join(rendererRoot, "scripts");

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            ensureDir(path.dirname(destPath));
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (entry.isFile()) {
            out.push(full);
        }
    }
    return out;
}

function collectScriptEntries() {
    const files = walk(scriptsDir, []);
    return files.filter((file) => path.extname(file).toLowerCase() === ".ts");
}

async function buildScripts() {
    const entryPoints = collectScriptEntries();
    if (!entryPoints.length) return;

    await esbuild.build({
        entryPoints,
        outbase: rendererRoot,
        outdir: distDir,
        bundle: true,
        platform: "browser",
        target: "es2020",
        format: "iife",
        sourcemap: true,
        minify: false,
        logLevel: "silent",
        define: {
            "process.env.NODE_ENV": '"production"',
        },
    });
}

async function buildRenderer() {
    ensureDir(distDir);
    copyDir(pagesDir, path.join(distDir, "pages"));
    copyDir(stylesDir, path.join(distDir, "styles"));
    await buildScripts();
}

buildRenderer().catch((err) => {
    console.error("[build-renderer] failed:", err);
    process.exit(1);
});
