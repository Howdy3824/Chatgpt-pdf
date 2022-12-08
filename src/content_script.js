async function init() {
  if (window.buttonsInterval) {
    clearInterval(window.buttonsInterval);
  }
  window.buttonsInterval = setInterval(() => {
    const actionsArea = document.querySelector("form>div>div");
    if (!actionsArea) {
      return;
    }
    const buttons = actionsArea.querySelectorAll("button");
    const hasTryAgainButton = Array.from(buttons).some((button) => {
      return !button.id?.includes("download");
    });
    if (hasTryAgainButton && buttons.length === 1) {
      const TryAgainButton = actionsArea.querySelector("button");
      addActionsButtons(actionsArea, TryAgainButton);
    } else if (!hasTryAgainButton) {
      removeButtons();
    }
  }, 200);
}

const Format = {
  PNG: "png",
  PDF: "pdf",
};

function removeButtons() {
  const downloadButton = document.getElementById("download-png-button");
  const downloadPdfButton = document.getElementById("download-pdf-button");
  const downloadHtmlButton = document.getElementById("download-html-button");
  if (downloadButton) {
    downloadButton.remove();
  }
  if (downloadPdfButton) {
    downloadPdfButton.remove();
  }
  if (downloadHtmlButton) {
    downloadHtmlButton.remove();
  }
}

function addActionsButtons(actionsArea, TryAgainButton) {
  const downloadButton = TryAgainButton.cloneNode(true);
  downloadButton.id = "download-png-button";
  downloadButton.innerText = "Generate PNG";
  downloadButton.onclick = () => {
    downloadThread();
  };
  actionsArea.appendChild(downloadButton);
  const downloadPdfButton = TryAgainButton.cloneNode(true);
  downloadPdfButton.id = "download-pdf-button";
  downloadPdfButton.innerText = "Download PDF";
  downloadPdfButton.onclick = () => {
    downloadThread({ as: Format.PDF });
  };
  actionsArea.appendChild(downloadPdfButton);
  const exportHtml = TryAgainButton.cloneNode(true);
  exportHtml.id = "download-html-button";
  exportHtml.innerText = "Share Link";
  exportHtml.onclick = () => {
    sendRequest();
  };
  actionsArea.appendChild(exportHtml);
}

function downloadThread({ as = Format.PNG } = {}) {
  const elements = new Elements();
  elements.fixLocation();
  const pixelRatio = window.devicePixelRatio;
  const minRatio = as === Format.PDF ? 2 : 2.5;
  window.devicePixelRatio = Math.max(pixelRatio, minRatio);

  //Fix to the text shifting down when generating the canvas
  document.body.style.lineHeight = '0.5';

  html2canvas(elements.thread, {
    letterRendering: true,
  }).then(async function (canvas) {
    elements.restoreLocation();
    window.devicePixelRatio = pixelRatio;
    const imgData = canvas.toDataURL("image/png");
    requestAnimationFrame(() => {
      if (as === Format.PDF) {
        return handlePdf(imgData, canvas, pixelRatio);
      } else {
        handleImg(imgData);
      }
    });
  });
}

function handleImg(imgData) {
  const binaryData = atob(imgData.split("base64,")[1]);
  const data = [];
  for (let i = 0; i < binaryData.length; i++) {
    data.push(binaryData.charCodeAt(i));
  }
  const blob = new Blob([new Uint8Array(data)], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");

  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "chat-gpt-image.png";
  //   a.click();
}

function handlePdf(imgData, canvas, pixelRatio) {
  const { jsPDF } = window.jspdf;
  const orientation = canvas.width > canvas.height ? "l" : "p";
  var pdf = new jsPDF(orientation, "pt", [
    canvas.width / pixelRatio,
    canvas.height / pixelRatio,
  ]);
  var pdfWidth = pdf.internal.pageSize.getWidth();
  var pdfHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("chat-gpt.pdf");
}

// async function getWidthHeightFromBase64(base64Img) {
//   return new Promise((resolve, reject) => {
//     // Then, create a new Image from the blob
//     const img = new Image();
//     img.src = base64Img;

//     img.onload = () => {
//       const width = img.width;
//       const height = img.height;
//       resolve({ width, height });
//     };
//   });
// }

class Elements {
  constructor() {
    this.init();
  }
  init() {
    // this.threadWrapper = document.querySelector(".cdfdFe");
    this.spacer = document.querySelector(".w-full.h-48.flex-shrink-0");
    this.thread = document.querySelector(
      "[class*='react-scroll-to-bottom']>[class*='react-scroll-to-bottom']>div"
    );
    this.positionForm = document.querySelector("form").parentNode;
    // this.styledThread = document.querySelector("main");
    // this.threadContent = document.querySelector(".gAnhyd");
    this.scroller = Array.from(
      document.querySelectorAll('[class*="react-scroll-to"]')
    ).filter((el) => el.classList.contains("h-full"))[0];
    this.hiddens = Array.from(document.querySelectorAll(".overflow-hidden"));
    this.images = Array.from(document.querySelectorAll("img[srcset]"));
  }
  fixLocation() {
    this.hiddens.forEach((el) => {
      el.classList.remove("overflow-hidden");
    });
    this.spacer.style.display = "none";
    this.thread.style.maxWidth = "960px";
    this.thread.style.marginInline = "auto";
    this.positionForm.style.display = "none";
    this.scroller.classList.remove("h-full");
    this.scroller.style.minHeight = "100vh";
    this.images.forEach((img) => {
      const srcset = img.getAttribute("srcset");
      img.setAttribute("srcset_old", srcset);
      img.setAttribute("srcset", "");
    });
  }
  restoreLocation() {
    this.hiddens.forEach((el) => {
      el.classList.add("overflow-hidden");
    });
    this.spacer.style.display = null;
    this.thread.style.maxWidth = null;
    this.thread.style.marginInline = null;
    this.positionForm.style.display = null;
    this.scroller.classList.add("h-full");
    this.scroller.style.minHeight = null;
    this.images.forEach((img) => {
      const srcset = img.getAttribute("srcset_old");
      img.setAttribute("srcset", srcset);
      img.setAttribute("srcset_old", "");
    });
  }
}

function selectElementByClassPrefix(classPrefix) {
  const element = document.querySelector(`[class^='${classPrefix}']`);
  return element;
}

async function sendRequest() {
  const data = getData();
  const uploadUrlResponse = await fetch(
    "https://chatgpt-static.s3.amazonaws.com/url.txt"
  );
  const uploadUrl = await uploadUrlResponse.text();
  fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      window.open(data.url, "_blank");
    });
}

function getData() {
  const globalCss = getCssFromSheet(
    document.querySelector("link[rel=stylesheet]").sheet
  );
  const localCss =
    getCssFromSheet(
      document.querySelector(`style[data-styled][data-styled-version]`).sheet
    ) || "body{}";
  const data = {
    main: document.querySelector("main").outerHTML,
    // css: `${globalCss} /* GLOBAL-LOCAL */ ${localCss}`,
    globalCss,
    localCss,
  };
  return data;
}

function getCssFromSheet(sheet) {
  return Array.from(sheet.cssRules)
    .map((rule) => rule.cssText)
    .join("");
}

// run init
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
