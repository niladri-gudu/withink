"use server";

import { revalidateTag } from "next/cache";

export async function getGithubStars() {
  try {
    const res = await fetch("https://api.github.com/repos/niladri-gudu/deardiary", {
      next: { 
        revalidate: 3600,
        tags: ["github-stars"] 
      },
    });

    if (!res.ok) throw new Error("Failed to fetch");
    
    const data = await res.json();
    return data.stargazers_count as number;
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return 128; // Your fallback
  }
}