"use server";

import fs from "fs";
import path from "path";

export type ChangelogRelease = {
  version: string;
  date: string;
  title: string;
  rawContent: string;
  highlights: string[];
};

export async function getChangelogReleasesAction(): Promise<{
  success: boolean;
  releases: ChangelogRelease[];
}> {
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) {
      return { success: true, releases: [] };
    }

    const content = fs.readFileSync(changelogPath, "utf-8");
    const sections = content.split(/## 🟢 /g).slice(1);

    const releases: ChangelogRelease[] = sections.map((sec) => {
      const lines = sec.trim().split("\n");
      const headerLine = lines[0] || ""; // ex: "[v2.4.0] - 2026-07-24 (Release Atual)"
      
      const versionMatch = headerLine.match(/\[(.*?)\]/);
      const dateMatch = headerLine.match(/(\d{4}-\d{2}-\d{2})/);

      const version = versionMatch ? versionMatch[1] : "v1.0.0";
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];
      const title = headerLine;

      const rawContent = lines.slice(1).join("\n").trim();

      const highlights = lines
        .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("### "))
        .map((l) => l.replace(/^[#\-\s*]+/, "").trim());

      return {
        version,
        date,
        title,
        rawContent,
        highlights,
      };
    });

    return { success: true, releases };
  } catch (err) {
    console.error("Erro ao ler CHANGELOG.md:", err);
    return { success: false, releases: [] };
  }
}
