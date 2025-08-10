

/* Event listener function for the COPY BUTTON */
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("pre.src").forEach(function (codeBlock) {
	const button = document.createElement("button");
	button.innerText = "Copy";
	button.className = "copy-btn";

	// Append button inside <pre>
	codeBlock.appendChild(button);

	button.addEventListener("click", function () {
	    const text = codeBlock.innerText.replace(button.innerText, ""); // exclude button text
	    navigator.clipboard.writeText(text.trim()).then(() => {
		button.innerText = "Copied!";
		setTimeout(() => (button.innerText = "Copy"), 1500);
	    });
	});
    });
});


/* Event listener for footnotes and sidenotes*/
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('a.footref[href^="#fn"]').forEach(ref => {
	const sup = ref.closest("sup") || ref;
	// idempotent: don't insert twice
	if (sup.nextElementSibling && sup.nextElementSibling.classList?.contains("footnote-sidenote")) return;
	
	const targetId = ref.getAttribute("href").replace(/^#/, ""); // works for fn.2 or fn2

	const anchor   = document.getElementById(targetId);
	if (!anchor) return;
	
	const footdef = anchor.closest(".footdef") || anchor.parentElement;
	if (!footdef) return;
	
	// 1) Prefer leaf paragraphs to avoid div+p duplication
	let paras = footdef.querySelectorAll("p.footpara");
	if (!paras.length) {
	    // fallback: any .footpara elements that don't contain another .footpara
	    paras = footdef.querySelectorAll(".footpara:not(:has(.footpara))");
	}

	// 2) Build HTML, de-duplicating by text content
	let parts = [];
	if (paras.length) {
	    const seen = new Set();
	    parts = Array.from(paras).map(p => {
		const txt = p.textContent.trim().replace(/\s+/g, " ");
		if (seen.has(txt)) return "";
		seen.add(txt);
		return p.innerHTML.trim();
	    }).filter(Boolean);
	}

	// 3) Fallback: clean full block if no paras found
	if (!parts.length) {
	    const clone = footdef.cloneNode(true);
	    clone.querySelectorAll("sup.footnum, a[role='doc-backlink']").forEach(n => n.remove());
	    parts = [clone.innerHTML.trim()];
	}

	// 4) Insert the sidenote
	const sn = document.createElement("span");
	sn.className = "sidenote footnote-sidenote";
	sn.setAttribute("data-fn", (ref.textContent || "").trim());
	sn.innerHTML = parts.join(" ");
	
	sup.insertAdjacentElement("afterend", sn);
    });
});


/* Function for setting the theme */
(function(){
    const root = document.documentElement;
    const storageKey = "theme";
    const saved = localStorage.getItem(storageKey);
    if (saved === "dark" || saved === "light") {
	root.setAttribute("data-theme", saved);
    }
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
	const current = root.getAttribute("data-theme");
	const next = current === "dark" ? "light" : "dark";
	// If no current (auto), assume we’re toggling to dark first
	const target = current ? next : "dark";
	root.setAttribute("data-theme", target);
	localStorage.setItem(storageKey, target);
    });
})();


/* Event listener for scrolling and changing the active label on the TOC */
document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector("#text-table-of-contents");
    if (!toc) { console.warn("No #text-table-of-contents found"); return; }

    const links = toc.querySelectorAll('a[href^="#"]'); // '^=' is a starts with operator.
    // <a href="#introduction">Intro</a>   matches  
    if (!links.length) { console.warn("No ToC links found"); return; }

    // Map: id -> link
    const linkById = new Map();
    links.forEach(a => {
	const id = decodeURIComponent(a.getAttribute("href").slice(1));
	const el = document.getElementById(id);
	if (el) linkById.set(id, a);
    });
    if (!linkById.size) { console.warn("No matching headings with IDs"); return; }

    // Headings to observe (h2–h4 usually)
    const headings = [...document.querySelectorAll("h2[id], h3[id], h4[id]")]
	  .filter(h => linkById.has(h.id));

    // Helper to mark active
    const setActive = (id) => {
	links.forEach(a => {
	    const active = a.getAttribute("href") === `#${id}`;
	    a.classList.toggle("is-active", active);
	    if (active) a.setAttribute("aria-current", "true");
	    else a.removeAttribute("aria-current");
	});
    };

    // Calculate sticky header offset in px
    const headerOffsetPx = 6.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);

    // Track visible headings (id -> distance from top)
    const visible = new Map();

    const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
	    const id = entry.target.id;
	    if (entry.isIntersecting) {
		// How far from the top (after header offset)
		const dist = entry.target.getBoundingClientRect().top - headerOffsetPx;
		visible.set(id, dist);
	    } else {
		visible.delete(id);
	    }
	});
	
	if (visible.size) {
	    // Choose the heading closest to the top (>= -headerOffset)
	    const topMost = [...visible.entries()]
		  .sort((a,b) => Math.abs(a[1]) - Math.abs(b[1]))[0][0];
	    setActive(topMost);
	    // console.log("Active:", topMost, visible);
	}
    }, {
	root: null,                                   // track relative to viewport
	rootMargin: `-${headerOffsetPx}px 0px -70% 0px`,
	threshold: [0, 0.01, 0.1]                     // fire as soon as it enters
    });
    
    headings.forEach(h => observer.observe(h));

    // Initial highlight (in case load mid‑page)
    let bestId = null, bestDist = Infinity;
    headings.forEach(h => {
	const top = h.getBoundingClientRect().top - headerOffsetPx;
	const dist = top < 0 ? Math.abs(top) : top + 1e6;
	if (dist < bestDist) { bestDist = dist; bestId = h.id; }
    });
    if (bestId) setActive(bestId);
    
    // smooth-scroll ToC clicks
    toc.addEventListener("click", (e) => {
	const a = e.target.closest('a[href^="#"]');
	if (!a) return;
	const id = decodeURIComponent(a.hash.slice(1));
	const el = document.getElementById(id);
	if (!el) return;
	e.preventDefault();
	el.scrollIntoView({ behavior: "smooth", block: "start" });
	el.setAttribute("tabindex", "-1");
	el.focus({ preventScroll: true });
	history.pushState(null, "", `#${id}`);
    });
});
