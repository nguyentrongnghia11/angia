import {
  getNews,
  getNewsDetail,
} from "https://automationland.vn/shared/api.js?v=2";
import {
  renderPagination,
  renderRichText,
  renderCatalogue,
} from "https://automationland.vn/shared/render.js?v=2";
import { updateMetaTags } from "https://automationland.vn/shared/metaSeo.js?v=2";
import {
  getWatermarkedUrl,
  applyListStyle,
} from "https://automationland.vn/shared/helperFunction.js?v=2";

let currentPage = 1;
let totalPages = 1;
let clickHandlerAttached = false;
let resizeHandlerAttached = false;

// --- Hàm xử lý responsive cho .colum-box-news ---
function updateBoxPosition() {
  const box = document.querySelector(".colum-box-news");
  if (!box) return;

  const width = window.innerWidth;

  if (width >= 1100) {
    const leftPercent = 25.2;
    const widthPercent = 68.5;

    box.style.left = `${leftPercent}%`;
    box.style.width = `${widthPercent}%`;
    box.style.right = "auto";
  } else {
    box.style.left = "";
    box.style.width = "";
    box.style.right = "";
  }
}

// --- Setup resize handler một lần duy nhất ---
function setupResizeHandler() {
  if (resizeHandlerAttached) return;
  resizeHandlerAttached = true;

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateBoxPosition, 100);
  });
}

// --- Render danh sách tin ---
async function renderNews(page = 1) {
  const loadx = document.querySelector(".loadx");
  const container = document.querySelector(".news-list .grid .outer");
  if (!container) return;

  if (loadx) loadx.style.display = "block";

  // Lưu lại slugId hiện tại nếu đang xem detail
  const currentSlugId = new URLSearchParams(window.location.search).get("id");

  // Xóa nội dung cũ trong container
  container.innerHTML = "";

  try {
    const result = await getNews({ page });

    if (!result?.success) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;color:#fff">
          Không thể tải tin tức...
        </div>
      `;
      return;
    }

    result.data.forEach((news) => {
      const date = new Date(news.createdAt);
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

      const div = document.createElement("div");
      div.className = "link-page ani-item";

      // Nếu đang xem detail, thêm class tương ứng
      if (currentSlugId) {
        if (news.slugId === currentSlugId) {
          div.classList.add("current");
        } else {
          div.classList.add("isview", "on-show", "on-view");
        }
      }
      const thumbnailURL =
        typeof getWatermarkedUrl === "function"
          ? getWatermarkedUrl(news.thumbnail, {
              paddingRight: 30,
              paddingBottom: 80,
            })
          : news.thumbnail;

      div.innerHTML = `
        <div class="box-news">
          <div class="pic-thumb">
            <div class="new-icon"></div>
            <div class="pic-img">
              <img class="lazy" src="${thumbnailURL}" alt="${news.title}" />
            </div>
          </div>
          <div class="head-text">
            <div class="date-thumb">${formattedDate}</div>
            <h3>${news.title}</h3>
            <a class="view-news" href="?id=${news.slugId}"></a>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    currentPage = result.pagination?.currentPage;
    totalPages = result.pagination?.totalPages;

    // Render pagination với hàm import
    renderPagination({
      containerSelector: ".pagination-container",
      totalPages: totalPages,
      currentPage: currentPage,
      onPageChange: async (page) => {
        await renderNews(page);
      },
    });
  } finally {
    if (loadx) loadx.style.display = "none";
  }
}

// --- Render chi tiết tin ---
async function loadNewsDetail(slugId) {
  const box = document.querySelector(".colum-box-news");
  const content = document.querySelector(".colum-box-news .news-content");
  const loadx = document.querySelector(".loadx"); // div hiệu ứng loading

  if (!box || !content) return;

  if (loadx) loadx.style.display = "block";

  // click vào button news list và back về trang news.html
  document.querySelector(".more-news")?.addEventListener("click", () => {
    window.location.href = "news.html";
  });

  try {
    // Xử lý class cho tất cả link-page dựa trên slugId
    document.querySelectorAll(".link-page").forEach((el) => {
      const link = el.querySelector(".view-news");
      const linkHref = link?.getAttribute("href");

      if (linkHref?.includes(slugId)) {
        el.classList.add("current");
        el.classList.remove("isview", "on-show", "on-view");
      } else {
        el.classList.remove("isview", "on-show", "on-view", "current");
        void el.offsetWidth; // reset animation
        el.classList.add("isview", "on-show", "on-view");
      }
    });

    const detail = await getNewsDetail(slugId);

    if (!detail?.success || !detail.data) {
      content.innerHTML = `<p style="color:#fff;text-align:center;padding:2rem">Không tìm thấy tin tức</p>`;
      box.classList.add("show");
      content.classList.add("show");
      return;
    }

    const news = detail.data;

    // Update SEO meta tags
    updateMetaTags({
      title: news.title,
      description: news.description || news.title,
      image: news.thumbnail,
      url: window.location.href,
      type: "article",
      publishedAt: news.createdAt,
    });

    const date = new Date(news.createdAt);
    const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

    const counters = { h2: 0 };
    const newsContent = renderNewsBlocks(
      news.content,
      news.listIndex,
      counters
    );

    // Render catalogue nếu có listIndex
    const catalogueElement =
      news.listIndex && news.listIndex.length > 0
        ? renderCatalogue(news.listIndex)
        : null;

    document.querySelector(".news-list")?.classList.add("hide");

    content.innerHTML = `
      <div class="scrollC">
        <div class="news-text white-text">
          <div class="date-thumb">${formattedDate}</div>
          <div class="title-news">
            <h2 style="text-transform:uppercase">${news.title}</h2>
            <div class="share" data-id="filter-text">
              <span>Share</span>
              <a class="share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                location.href
              )}" target="_blank" rel="nofollow noopener" style="filter:none;"></a>
            </div>
          </div>
          <div id="catalogue-container"></div>
          ${newsContent}
        </div>
      </div>
    `;

    // Append catalogue vào container nếu có
    if (catalogueElement) {
      const catalogueContainer = content.querySelector("#catalogue-container");
      if (catalogueContainer) {
        catalogueContainer.appendChild(catalogueElement);
      }
    }
    box.classList.add("show");

    // Áp dụng responsive positioning
    updateBoxPosition();

    content.classList.add("show");
    content.style.opacity = "1";
  } finally {
    if (loadx) loadx.style.display = "none";
  }
}

// --- Render nội dung ---
function renderNewsBlocks(blocks, listIndex = [], counters = { h2: 0 }) {
  let htmlOutput = "";

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        if (Array.isArray(block.richText)) {
          htmlOutput += `<p>${renderRichText(block.richText)}</p>`;
        } else {
          htmlOutput += `<p>${block.text || ""}</p>`;
        }
        break; // Thoát case

      case "heading":
        // Lấy level (mặc định là 2 nếu không có)
        const level = block.level?.replace("H", "") || "2";
        const rawText = block.text || "";

        // Logic đếm số (Chỉ đếm nếu là H2)
        let displayText = rawText;
        if (level === "2") {
          counters.h2 += 1;
          displayText = `${counters.h2}. ${rawText}`;
        }

        // Logic tìm ID từ listIndex
        // Tìm item có title trùng khớp với text gốc
        const foundItem = listIndex.find(
          (item) => item.title.trim() === rawText.trim()
        );

        let finalId = "";
        if (foundItem && foundItem.slug) {
          finalId = foundItem.slug;
        } else {
          // Fallback: Tự tạo slug nếu không tìm thấy (để tránh lỗi ID rỗng)
          finalId = rawText.trim().toLowerCase().replace(/\s+/g, "-");
        }

        // Cộng chuỗi HTML
        // Lưu ý: Thêm scroll-margin-top để tránh header che mất khi cuộn
        htmlOutput += `<h${level} id="${finalId}" style="text-align: justify; scroll-margin-top: 100px;">${displayText}</h${level}>`;
        break;

      case "image":
        const mergeImageUrl =
          typeof getWatermarkedUrl === "function"
            ? getWatermarkedUrl(block.url, { width: 0.05 })
            : block.url;
        htmlOutput += `
          <figure class="figure-img">
            <img src="${mergeImageUrl}" alt="${
          block.alt || ""
        }" style="max-width:100%;height:auto" />
            ${
              block.caption
                ? `<p style="text-align:center">${block.caption}</p>`
                : ""
            }
          </figure>
        `;
        break; // Thoát case

      case "list":
        const listStyle = applyListStyle(null, block.listStyle);
        const items = (block.items || [])
          .map((item) => {
            // Xử lý từng item trong list
            if (Array.isArray(item)) {
              return renderRichText(item);
            }
            return item.text || item;
          })
          .map((text) => `<li style="margin-bottom:10px">${text}</li>`)
          .join("");

        htmlOutput += `<ul style="${listStyle};padding-left:20px">${items}</ul>`;
        break; // Thoát case

      case "table":
        const tableData = block.tableData || block.content || {}; // Fallback an toàn
        const rows = Array.isArray(tableData.rows) ? tableData.rows : [];
        const withHeading = !!tableData.withHeading; // Ép kiểu boolean

        // Lấy caption từ data hoặc fallback (như yêu cầu cũ của bạn)
        const captionText =
          tableData.caption || block.caption || "chú thích 1: Bảng sân golf";

        if (rows.length === 0) break;

        // 1. Mở thẻ Figure (Wrapper chính)
        htmlOutput += `<figure class="wp-block-table" style="margin: 20px 0; display: block;">`;

        // 2. Mở thẻ Div (Scroll Wrapper) để cuộn bảng
        htmlOutput += `<div style="overflow-x: auto; width: 100%;">`;

        // 3. Mở thẻ Table
        htmlOutput += `<table class="news-table" style="width: 100%; border-collapse: collapse;">`;

        let theadContent = "";
        let tbodyContent = "";

        // Duyệt qua các dòng để xây dựng HTML
        rows.forEach((row, rowIndex) => {
          const isHeaderRow = withHeading && rowIndex === 0;
          const cellTag = isHeaderRow ? "th" : "td";

          // Mở thẻ tr
          let rowHTML = `<tr style="border-bottom: 1px solid #e5e7eb;">`;

          // Duyệt qua các ô
          row.forEach((cell) => {
            let cellContent = "";

            // Logic render nội dung Rich Text (giữ nguyên logic cũ)
            if (Array.isArray(cell)) {
              cellContent = renderRichText(cell);
            } else if (cell && typeof cell === "object") {
              if (Array.isArray(cell.richText)) {
                cellContent = renderRichText(cell.richText);
              } else {
                cellContent = cell.text || "";
              }
            } else {
              cellContent = String(cell || "");
            }

            // Nối chuỗi thẻ td/th
            rowHTML += `
              <${cellTag} >
                ${cellContent}
              </${cellTag}>
            `;
          });

          rowHTML += `</tr>`;

          // Phân loại vào thead hoặc tbody
          if (isHeaderRow) {
            theadContent += rowHTML;
          } else {
            tbodyContent += rowHTML;
          }
        });

        // Ghép thead và tbody vào table
        if (theadContent) {
          htmlOutput += `<thead>${theadContent}</thead>`;
        }
        if (tbodyContent) {
          htmlOutput += `<tbody>${tbodyContent}</tbody>`;
        }

        // Đóng thẻ Table và Div Scroll
        htmlOutput += `</table></div>`;

        // 4. Thêm Caption (nếu có)
        if (captionText) {
          htmlOutput += `
            <figcaption class="table-caption">
              ${captionText}
            </figcaption>
          `;
        }

        // Đóng thẻ Figure
        htmlOutput += `</figure>`;
        break;

      default:
        break;
    }
  }

  return htmlOutput;
}

// --- Event handler ---
function setupNewsClickHandler() {
  if (clickHandlerAttached) return;
  clickHandlerAttached = true;

  document.addEventListener(
    "click",
    (e) => {
      const linkPage = e.target.closest(".link-page");
      if (!linkPage) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const viewNewsLink = linkPage.querySelector(".view-news");
      const href = viewNewsLink?.getAttribute("href");
      if (!href) return;

      const slugId = href.split("=")[1];

      // Xử lý class cho tất cả link-page
      document.querySelectorAll(".link-page").forEach((el) => {
        if (el === linkPage) {
          // Item được click: thêm class current
          el.classList.add("current");
          el.classList.remove("isview", "on-show", "on-view");
        } else {
          // Xóa class trước để reset animation
          el.classList.remove("isview", "on-show", "on-view", "current");

          // Trigger reflow để reset animation
          void el.offsetWidth;

          // Thêm class lại để trigger animation
          el.classList.add("isview", "on-show", "on-view");
        }
      });

      // Cập nhật URL + load detail
      history.pushState({}, "", `?id=${slugId}`);
      loadNewsDetail(slugId);
    },
    { capture: true }
  );
}

// Hàm load theo URL hiện tại
async function loadFromUrl() {
  const slugId = new URLSearchParams(window.location.search).get("id");

  if (slugId) {
    await renderNews(1);
    await loadNewsDetail(slugId);
  } else {
    await renderNews(1);
  }
}

// Tự động chạy khi DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  setupNewsClickHandler();
  setupResizeHandler();

  // Gọi lần đầu
  await loadFromUrl();

  // Áp dụng responsive positioning ngay sau khi load
  updateBoxPosition();

  window.addEventListener("popstate", loadFromUrl);
});
