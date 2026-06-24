// Pagination algorithm — runs in browser context via page.evaluate()
// This file is read at runtime and passed as a string to avoid template-literal escaping.
// All values in {{BRACES}} are replaced before evaluation.

(function() {
  var PW = {{PW}}, PH = {{PH}}, PD = {{PD}}, MAX_CODE = {{MAX_CODE}};
  var FILL = Math.max(0, Math.min(1, {{FILL}}));
  var docTitle = "{{DOC_TITLE}}";

  // ── Named constants ───────────────────────────────────────
  var HEADER_HEIGHT = 80;       // Header reserve height (title repetition)
  var BOTTOM_SPACER = 40;       // Bottom padding
  var MIN_SPACE_FOR_SPLIT = 200;// Minimum remaining space (px) to allow paragraph split
  var MAX_OVERFLOW_FIX = 12;    // Max overflow fix iterations
  var FILL_TARGET = FILL;       // Fill balancing target ratio
  var FILL_EMPTY_THRESH = Math.max(0, FILL_TARGET - 0.08); // Page "too empty" threshold, triggers pull from next page
  var FILL_PULL_MIN = Math.max(0, Math.min(0.30, FILL_EMPTY_THRESH / 2)); // Minimum page occupancy to allow pulling from
  var SCALE_FACTOR_MAX = 0.98;  // Max image scale-down factor
  var headerReserve = docTitle ? HEADER_HEIGHT : 0;
  var contentArea = PH - PD * 2;
  var bottomSpacer = BOTTOM_SPACER;
  var contentLimit = contentArea - bottomSpacer;

  var body = document.body;
  // Capture body background before modifying body styles
  var bodyBg = window.getComputedStyle(body).backgroundColor;
  // Normalize transparent to white
  if (!bodyBg || bodyBg === "rgba(0, 0, 0, 0)" || bodyBg === "transparent") {
    bodyBg = "#ffffff";
  }
  body.style.padding = "0";
  body.style.margin = "0";
  // Override body constraints from Typora themes (#write→body replacement).
  // Set body width to exactly match card content area so children measure correctly.
  body.style.maxWidth = (PW - PD * 2) + "px";
  body.style.width = (PW - PD * 2) + "px";
  body.style.minHeight = "0px";
  body.style.minWidth = "0px";
  body.style.position = "static";
  body.style.overflow = "hidden";
  body.style.boxSizing = "border-box";
  var children = Array.from(body.children);
  children.forEach(function(el) { el.style.display = "none"; });

  // Ensure all elements use border-box (Typora themes default to content-box)
  var boxStyle = document.createElement("style");
  boxStyle.textContent = "*{box-sizing:border-box!important}";
  document.head.appendChild(boxStyle);

  var cards = [];
  var pageIdx = 0;
  var card;

  function newCard() {
    card = document.createElement("div");
    card.className = "page-card";
    card.dataset.page = String(pageIdx);
    card.style.cssText = "width:"+PW+"px;height:"+PH+"px;overflow:hidden;padding:"+PD+"px;box-sizing:border-box;background:"+bodyBg+";position:absolute;left:0;top:"+(pageIdx*PH)+"px;";

    var content = document.createElement("div");
    content.className = "page-content";
    content.style.cssText = "width:100%;display:flow-root;";
    card.appendChild(content);

    document.body.appendChild(card);
    cards.push(card);
    pageIdx++;
  }

  function contentOf(crd) {
    return (crd || card).querySelector(".page-content");
  }

  function appendToCard(el, crd) {
    contentOf(crd).appendChild(el);
  }

  function removeFromCard(el, crd) {
    contentOf(crd).removeChild(el);
  }

  function firstContentChild(crd) {
    return contentOf(crd).firstElementChild;
  }

  function lastContentChild(crd) {
    return contentOf(crd).lastElementChild;
  }

  function used(crd) {
    var c = contentOf(crd || card);
    void c.offsetHeight;
    return c.getBoundingClientRect().height;
  }

  function limitFor(crd) {
    var crdIdx = cards.indexOf(crd || card);
    return contentLimit - (crdIdx > 0 ? headerReserve : 0);
  }

  function finalLimitFor() {
    return contentArea;
  }

  function isOver(crd) {
    return used(crd) > limitFor(crd || card);
  }

  function avail(crd) {
    return limitFor(crd || card) - used(crd);
  }

  function ratio(crd) {
    return used(crd) / limitFor(crd || card);
  }

  function isHeading(t) {
    return t==="h1"||t==="h2"||t==="h3"||t==="h4"||t==="h5"||t==="h6";
  }

  function setImgMaxH(el, h) {
    var imgs = el.querySelectorAll ? el.querySelectorAll("img") : [];
    if (el.tagName && el.tagName.toLowerCase() === "img") imgs = [el];
    for (var k = 0; k < imgs.length; k++) {
      imgs[k].style.maxHeight = Math.max(1, Math.floor(h)) + "px";
      imgs[k].style.maxWidth = "100%";
      imgs[k].style.width = "auto";
      imgs[k].style.height = "auto";
      imgs[k].style.objectFit = "contain";
      imgs[k].style.display = "block";
    }
  }

  function isImageBlock(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === "img" || (tag === "p" && !!el.querySelector("img"));
  }

  function fitImageIntoCurrentPage(el, space) {
    var maxH = Math.max(1, space);
    setImgMaxH(el, maxH);
    appendToCard(el);

    for (var n = 0; n < MAX_OVERFLOW_FIX && isOver(); n++) {
      var overflow = used() - limitFor();
      maxH = Math.max(1, maxH - overflow - 1);
      setImgMaxH(el, maxH);
    }

    if (isOver()) {
      removeFromCard(el);
      return false;
    }
    return true;
  }

  function imageBox(img) {
    var parent = img.parentElement;
    if (
      parent &&
      parent.tagName &&
      parent.tagName.toLowerCase() === "p" &&
      parent.querySelectorAll("img").length === 1
    ) {
      return parent;
    }
    return img;
  }

  function currentImageHeight(img) {
    var rect = img.getBoundingClientRect();
    if (rect.height > 0) return rect.height;
    var styled = parseFloat(img.style.maxHeight);
    if (styled > 0) return styled;
    return img.naturalHeight || 700;
  }

  function scaleAllImagesOnPage(crd) {
    var content = contentOf(crd);
    var imgs = Array.from(content.querySelectorAll("img"));
    if (imgs.length < 2 || !isOver(crd)) return false;

    var originals = imgs.map(function(img) {
      return { img: img, maxHeight: img.style.maxHeight };
    });

    for (var step = 0; step < MAX_OVERFLOW_FIX && isOver(crd); step++) {
      var overflow = used(crd) - limitFor(crd);
      var imageHeight = 0;
      for (var h = 0; h < imgs.length; h++) imageHeight += currentImageHeight(imgs[h]);
      if (imageHeight <= 0) break;

      var factor = Math.max(0.1, Math.min(SCALE_FACTOR_MAX, (imageHeight - overflow - 2) / imageHeight));
      for (var k = 0; k < imgs.length; k++) {
        var newH = currentImageHeight(imgs[k]) * factor;
        setImgMaxH(imageBox(imgs[k]), Math.max(1, newH));
      }
    }

    if (!isOver(crd)) return true;

    for (var r = 0; r < originals.length; r++) {
      originals[r].img.style.maxHeight = originals[r].maxHeight;
    }
    return false;
  }

  // ── Sentence-boundary text splitting ─────────────────
  // Split text blocks at sentence-ending punctuation (CJK and Latin) and newlines

  function isSentenceEnd(ch) {
    if (!ch) return false;
    // Check common sentence-ending punctuation
    if (ch === "。" || ch === "！" || ch === "？" ||  // 。！？
        ch === "." || ch === "!" || ch === "?") return true;
    // Check newline / carriage return
    var code = ch.charCodeAt(0);
    return code === 10 || code === 13;
  }

  function isSpace(ch) {
    if (!ch) return false;
    var code = ch.charCodeAt(0);
    // space, tab, newline, CR, fullwidth space (U+3000)
    return code === 32 || code === 9 || code === 10 || code === 13 || code === 12288;
  }

  function splitIntoSentences(el) {
    // Bail out if element has inline children (strong, em, a, code, img, etc.)
    // because cloneNode(false) + textContent replacement would silently discard them
    if (el.children && el.children.length > 0) return null;
    var text = el.textContent || "";
    if (text.length < 10) return null;

    var parts = [];
    var start = 0;
    for (var i = 0; i < text.length; i++) {
      if (isSentenceEnd(text.charAt(i))) {
        var end = i + 1;
        while (end < text.length && isSpace(text.charAt(end))) {
          end++;
        }
        parts.push(text.substring(start, end));
        start = end;
        i = end - 1;
      }
    }
    if (start < text.length) {
      var trailing = text.substring(start).trim();
      if (trailing.length > 0) {
        parts.push(text.substring(start));
      }
    }

    if (parts.length < 2) return null;
    return parts;
  }

  function tryFitSentencePrefix(el, sentences, crd) {
    var lo = 1, hi = sentences.length, best = 0;
    var crdRef = crd || card;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var testEl = el.cloneNode(false);
      testEl.textContent = sentences.slice(0, mid).join("");
      if (el.style.marginTop) testEl.style.marginTop = el.style.marginTop;
      if (el.style.marginBottom) testEl.style.marginBottom = el.style.marginBottom;
      appendToCard(testEl, crdRef);
      if (!isOver(crdRef)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
      removeFromCard(testEl, crdRef);
    }
    return best;
  }

  function isTextBlock(t) {
    return t === "p" || t === "li" || t === "blockquote" || t === "td" || t === "th";
  }

  // ── Main pagination loop ────────────────────────────

  newCard();

  for (var i = 0; i < children.length; i++) {
    var c = children[i];
    c.style.display = "";
    var clone = c.cloneNode(true);
    appendToCard(clone);

    if (!isOver()) continue;

    removeFromCard(clone);
    var tag = c.tagName.toLowerCase();
    var isImg = isImageBlock(c);

    if (isImg) {
      var imgsOnPage = Array.from(contentOf().querySelectorAll("img")).length;

      if (imgsOnPage > 0) {
        var tryClone = c.cloneNode(true);
        appendToCard(tryClone);
        if (!scaleAllImagesOnPage(card)) {
          removeFromCard(tryClone);
          newCard();
          fitImageIntoCurrentPage(c.cloneNode(true), limitFor());
        }
      } else {
        var space = avail();
        if (space > MIN_SPACE_FOR_SPLIT) {
          var sClone = c.cloneNode(true);
          if (!fitImageIntoCurrentPage(sClone, space)) {
            newCard();
            fitImageIntoCurrentPage(c.cloneNode(true), limitFor());
          }
        } else {
          newCard();
          fitImageIntoCurrentPage(c.cloneNode(true), limitFor());
        }
      }
    } else if (tag === "pre") {
      var codeEl = c.querySelector("code");
      var lines = (codeEl ? codeEl.textContent : "").split("\n");
      while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }
      var langClass = codeEl ? codeEl.className : "";

      var split = lines.length;
      var fillTarget = limitFor();
      var maxTry = (MAX_CODE > 0 && MAX_CODE < lines.length) ? MAX_CODE : lines.length;
      for (var j = 1; j <= maxTry; j++) {
        var tPre = document.createElement("pre");
        tPre.className = c.className;
        tPre.style.marginBottom = "0";
        var tCode = document.createElement("code");
        tCode.className = langClass;
        tCode.textContent = lines.slice(0, j).join("\n");
        tPre.appendChild(tCode);
        appendToCard(tPre);
        if (isOver() || used() > fillTarget) {
          split = j - 1;
          removeFromCard(tPre);
          break;
        }
        removeFromCard(tPre);
      }

      if (split > 0) {
        var p1 = document.createElement("pre");
        p1.className = c.className;
        p1.style.marginBottom = "0";
        var cd1 = document.createElement("code");
        cd1.className = langClass;
        cd1.textContent = lines.slice(0, split).join("\n");
        p1.appendChild(cd1);
        appendToCard(p1);
      }

      var restLines = lines.slice(Math.max(0, split));
      if (restLines.join("").trim().length > 0) {
        newCard();
        var p2 = document.createElement("pre");
        p2.className = c.className;
        p2.style.marginTop = "0";
        var cd2 = document.createElement("code");
        cd2.className = langClass;
        cd2.textContent = restLines.join("\n");
        p2.appendChild(cd2);
        appendToCard(p2);
        // Guard: if content still overflows the fresh page (e.g. single extremely
        // long line exceeding contentWidth), clamp instead of crashing at verification
        if (isOver()) {
          p2.style.maxHeight = limitFor() + "px";
          p2.style.overflow = "hidden";
        }
      }
    } else if (isHeading(tag) && i + 1 < children.length) {
      var hClone = c.cloneNode(true);
      appendToCard(hClone);
      if (isOver()) {
        // Heading doesn't fit at all → new page
        removeFromCard(hClone);
        newCard();
        appendToCard(hClone);
      }
      // Try to bring next content along
      var nChild = children[i + 1];
      nChild.style.display = "";
      var nClone = nChild.cloneNode(true);
      appendToCard(nClone);
      if (!isOver()) {
        i = i + 1; // next content fits alongside heading
        nChild.style.display = "none"; // re-hide original
      } else {
        // Content doesn't fully fit alongside heading.
        // Heading stays — when the loop reaches nChild, the text-block
        // handler will naturally sentence-split it: prefix fills current
        // page alongside heading, suffix overflows to next page.
        removeFromCard(nClone);
        // Don't skip nChild — let the loop handle it naturally.
        // nChild was made visible, but will be re-hidden when loop processes it.
        nChild.style.display = "none"; // re-hide for now, loop will show it
      }
    } else if (isTextBlock(tag)) {
      // Try Xiaohongshu-style sentence-boundary splitting
      var sentences = splitIntoSentences(c);
      if (sentences && sentences.length >= 2) {
        var fit = tryFitSentencePrefix(c, sentences, card);
        if (fit > 0 && fit < sentences.length) {
          var prefixEl = c.cloneNode(false);
          prefixEl.textContent = sentences.slice(0, fit).join("");
          appendToCard(prefixEl);
          newCard();
          var suffixEl = c.cloneNode(false);
          suffixEl.textContent = sentences.slice(fit).join("");
          appendToCard(suffixEl);
        } else if (fit === 0) {
          newCard();
          appendToCard(clone);
        } else {
          appendToCard(clone);
        }
      } else {
        newCard();
        appendToCard(clone);
      }
    } else {
      newCard();
      appendToCard(clone);
    }
    // Re-hide the original element — it's been cloned into a card.
    // This prevents body content from showing through transparent cards.
    c.style.display = "none";
  }

  // Clear last-child margins
  for (var p = 0; p < cards.length; p++) {
    var crd = cards[p];
    var last = lastContentChild(crd);
    if (last) last.style.marginBottom = "0";
  }

  // ── Heading-orphan prevention ────────────────────
  function isSpacer(el) {
    return el.getAttribute && el.getAttribute("data-spacer") === "1";
  }

  function moveElementsBefore(elements, fromCrd, toCrd, anchor) {
    for (var m = 0; m < elements.length; m++) {
      removeFromCard(elements[m], fromCrd);
      elements[m].style.marginTop = "0";
      if (anchor) {
        contentOf(toCrd).insertBefore(elements[m], anchor);
      } else {
        appendToCard(elements[m], toCrd);
      }
    }
  }

  function contentChildrenWithoutSpacers(crd) {
    return Array.from(contentOf(crd).children).filter(function(el) { return !isSpacer(el); });
  }

  function preventTrailingHeadingOrphans() {
    // Only pages with a following content page can be fixed. A document that
    // literally ends with a heading has no body content to keep with it.
    for (var p2 = 0; p2 < cards.length - 1; p2++) {
      var moved = true;
      while (moved) {
        moved = false;
        var cKids = contentChildrenWithoutSpacers(cards[p2]);
        if (cKids.length === 0) break;

        var tailStart = cKids.length;
        for (var k = cKids.length - 1; k >= 0; k--) {
          var kidTag = cKids[k].tagName.toLowerCase();
          if (!isHeading(kidTag)) break;
          tailStart = k;
        }

        if (tailStart === cKids.length || tailStart === 0) break;

        var tail = cKids.slice(tailStart);
        var nextCrd2 = cards[p2 + 1];
        var nFirst2 = firstContentChild(nextCrd2);
        moveElementsBefore(tail, cards[p2], nextCrd2, nFirst2);

        if (isOver(nextCrd2)) {
          // Moving all headings overflowed — try moving a subset
          // Revert all first, then try with fewer headings
          for (var r = 0; r < tail.length; r++) {
            removeFromCard(tail[r], nextCrd2);
          }
          for (var a = 0; a < tail.length; a++) {
            appendToCard(tail[a], cards[p2]);
          }

          // Try moving fewer headings (skip the last/first heading in the tail)
          var partialSuccess = false;
          for (var subLen = tail.length - 1; subLen >= 1; subLen--) {
            var subTail = tail.slice(tail.length - subLen);
            moveElementsBefore(subTail, cards[p2], nextCrd2, nFirst2);
            if (!isOver(nextCrd2)) {
              partialSuccess = true;
              break;
            }
            // Revert subset
            for (var rs = 0; rs < subTail.length; rs++) {
              removeFromCard(subTail[rs], nextCrd2);
            }
            for (var as = 0; as < subTail.length; as++) {
              appendToCard(subTail[as], cards[p2]);
            }
          }

          if (partialSuccess) {
            moved = true;
            // Continue the while loop to check for more orphaned headings
            continue;
          }
          break;
        }

        moved = true;
      }
      var curLast = lastContentChild(cards[p2]);
      if (curLast) curLast.style.marginBottom = "0";
    }
  }

  function removeEmptyCards() {
    for (var ec = cards.length - 1; ec >= 0; ec--) {
      if (cards.length <= 1) break;
      if (contentChildrenWithoutSpacers(cards[ec]).length > 0) continue;
      if (cards[ec].parentElement) {
        cards[ec].parentElement.removeChild(cards[ec]);
      }
      cards.splice(ec, 1);
    }
  }

  preventTrailingHeadingOrphans();

  // ── Fill balancing: aggressive content redistribution ──
  // For under-filled pages (< 60%), pull elements from subsequent pages.
  // Tries multiple elements and follows headings with their content.

  function pullElementsFrom(cur, nxt) {
    var nxtKids = contentChildrenWithoutSpacers(nxt);
    if (nxtKids.length === 0) return false;

    var pulledAny = false;
    for (var pk = 0; pk < nxtKids.length; pk++) {
      if (ratio(cur) > FILL_TARGET) break; // full enough

      var kid = nxtKids[pk];
      var kidTag = kid.tagName.toLowerCase();

      // If heading, try to pull the full contiguous heading run + first body element.
      if (isHeading(kidTag) && pk + 1 < nxtKids.length) {
        // Find the first non-heading after this heading
        var followerIdx = pk + 1;
        while (followerIdx < nxtKids.length && isHeading(nxtKids[followerIdx].tagName.toLowerCase())) {
          followerIdx++;
        }
        if (followerIdx >= nxtKids.length) continue; // no content follows, can't pull heading alone

        var testEls = [];
        for (var hi = pk; hi <= followerIdx; hi++) {
          var testEl2 = nxtKids[hi].cloneNode(true);
          testEls.push(testEl2);
          appendToCard(testEl2, cur);
        }
        if (!isOver(cur)) {
          // The whole group fits — move it in original order.
          for (var mi = pk; mi <= followerIdx; mi++) {
            removeFromCard(nxtKids[mi], nxt);
          }
          // Refresh nxtKids since we removed elements
          nxtKids = contentChildrenWithoutSpacers(nxt);
          pk = -1; // restart scan
          pulledAny = true;
          continue;
        }
        for (var ri = testEls.length - 1; ri >= 0; ri--) {
          removeFromCard(testEls[ri], cur);
        }
        // Heading group too big, skip this heading group.
        pk = followerIdx; // skip past the follower
        continue;
      }

      // If heading at start of page with no follower we can pull, skip
      if (isHeading(kidTag)) continue;

      // Try pulling this element
      var testEl = kid.cloneNode(true);
      appendToCard(testEl, cur);
      if (!isOver(cur)) {
        removeFromCard(kid, nxt);
        nxtKids = contentChildrenWithoutSpacers(nxt);
        pk = -1; // restart scan
        pulledAny = true;
      } else {
        removeFromCard(testEl, cur);
      }
    }
    return pulledAny;
  }

  // Multiple balancing passes for thorough redistribution
  for (var pass = 0; pass < 3; pass++) {
    var anyChange = false;
    for (var bp = 0; bp < cards.length - 1; bp++) {
      var cur = cards[bp];
      if (ratio(cur) > FILL_EMPTY_THRESH) continue;

      // Try pulling from each subsequent page until cur is full enough
      for (var np = bp + 1; np < cards.length; np++) {
        if (ratio(cur) > FILL_TARGET) break;
        if (pullElementsFrom(cur, cards[np])) {
          anyChange = true;
        } else {
          break; // can't pull from this page, try next bp
        }
      }
    }
    if (!anyChange) break; // converged
  }

  // Final cleanup: if a page is under-filled (< 30%), merge it into previous
  for (var mp = cards.length - 1; mp > 0; mp--) {
    var c = cards[mp];
    if (ratio(c) > FILL_PULL_MIN) continue;
    var prev = cards[mp - 1];
    var cKids = contentChildrenWithoutSpacers(c);
    if (cKids.length === 0) continue;

    // Move all children from c to prev
    for (var mk = 0; mk < cKids.length; mk++) {
      var testEl = cKids[mk].cloneNode(true);
      appendToCard(testEl, prev);
      if (!isOver(prev)) {
        removeFromCard(cKids[mk], c);
      } else {
        removeFromCard(testEl, prev);
      }
    }

    // After merge attempt, clean up: if source page is now empty, remove the card
    // so we don't leave orphaned children at low fill ratios
    if (contentChildrenWithoutSpacers(c).length === 0) {
      if (c.parentElement) {
        c.parentElement.removeChild(c);
      }
      cards.splice(mp, 1);
    }
  }

  // Fill balancing and final cleanup can create new trailing-heading tails.
  // Run the orphan pass again after all redistribution and before visual spacers.
  preventTrailingHeadingOrphans();
  removeEmptyCards();

  // ── Bottom spacers ────────────────────────────────
  for (var sp = 0; sp < cards.length; sp++) {
    if (used(cards[sp]) + bottomSpacer <= limitFor(cards[sp])) {
      var spacer = document.createElement("div");
      spacer.style.cssText = "height:"+bottomSpacer+"px;width:1px;display:block;margin:0;padding:0;";
      spacer.setAttribute("data-spacer", "1");
      appendToCard(spacer, cards[sp]);
    }
  }

  // ── Final positioning ─────────────────────────────
  for (var q = 0; q < cards.length; q++) {
    cards[q].dataset.page = String(q);
    cards[q].style.top = (q * PH) + "px";
  }

  // Page headers for pages 2+
  for (var ph = 1; ph < cards.length; ph++) {
    if (docTitle) {
      var content = contentOf(cards[ph]);
      var header = document.createElement("div");
      header.className = "page-header";
      var headerTitle = document.createElement("h1");
      headerTitle.textContent = docTitle;
      header.appendChild(headerTitle);
      content.insertBefore(header, content.firstChild);
    }
  }

  // Page numbers
  for (var pn = 0; pn < cards.length; pn++) {
    var pnEl = document.createElement("div");
    pnEl.className = "page-number";
    pnEl.textContent = (pn + 1) + " / " + cards.length;
    cards[pn].appendChild(pnEl);
  }

  // ── Overflow verification (after headers & page numbers) ──
  for (var v = 0; v < cards.length; v++) {
    var finalUsed = used(cards[v]);
    var finalLimit = finalLimitFor();
    if (finalUsed > finalLimit) {
      throw new Error(
        "Pagination overflow on page " + (v + 1) + ": used " + finalUsed + "px of " + finalLimit + "px"
      );
    }
  }

  return cards.length;
})()
