// Date picker functionality
let datepicker = document.getElementById("date-picker");
const todayDate = new Date();

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

for (let i = 1; i <= 7; i++) {
  let optionDate = new Date(todayDate);
  optionDate.setDate(todayDate.getDate() - i);
  let formattedDate = formatDate(optionDate);
  let option = document.createElement("option");
  option.value = formattedDate;
  option.textContent = formattedDate;
  datepicker.appendChild(option);
}

let dynamicEditionCard = null;

datepicker.addEventListener("change", async function () {
  const selectedDate = datepicker.value;
  if (!selectedDate) return;
  try {
    const resp = await fetch(`/getbydate?date=${selectedDate}`);
    const data = await resp.json();
    if (data && data.length > 0) {
      const epaper = data[0];
      updateOrCreateDynamicCard(epaper);
    } else {
      alert("No newspaper found for the selected date");
      if (dynamicEditionCard) {
        dynamicEditionCard.remove();
        dynamicEditionCard = null;
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Error loading newspaper data. Please try again.");
  }
});

function updateOrCreateDynamicCard(epaper) {
  const editionContainer = document.querySelector(".edition-container");
  if (!dynamicEditionCard) {
    dynamicEditionCard = document.createElement("div");
    dynamicEditionCard.className = "edition-card dynamic-edition";
    dynamicEditionCard.innerHTML = `
      <a href="#" class="view-pdf">
        <img src="" alt="" />
      </a>
      <div class="edition-title"></div>
    `;
    const originalCard = document.querySelector(
      ".edition-card:not(.dynamic-edition)"
    );
    editionContainer.insertBefore(dynamicEditionCard, originalCard.nextSibling);
    dynamicEditionCard
      .querySelector(".view-pdf")
      .addEventListener("click", function (e) {
        e.preventDefault();
        const pdfUrl = this.getAttribute("data-pdf-url");
        const title = this.getAttribute("data-title");
        openPdfModal(pdfUrl, title);
      });
  }
  const pdfLink = dynamicEditionCard.querySelector(".view-pdf");
  const editionImage = dynamicEditionCard.querySelector("img");
  const editionTitle = dynamicEditionCard.querySelector(".edition-title");
  pdfLink.setAttribute("data-pdf-url", epaper.edition1PdfFile);
  pdfLink.setAttribute("data-title", epaper.edition1Title || "");
  editionImage.src = epaper.edition1Image;
  editionImage.alt = epaper.edition1Title || "Edition Image";
  editionTitle.textContent = epaper.edition1Title || "";
}

// PDF.js initialization
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
let pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  scale = 1.5,
  jcropInstance = null,
  tempCanvas = null;

// DOM elements
const pdfModal = document.getElementById("pdf-modal");
const pdfViewerContainer = document.getElementById("pdf-viewer-container");
const pdfImage = document.getElementById("pdf-image");
const shareModal = document.getElementById("share-modal");
const croppedImageContainer = document.getElementById(
  "cropped-image-container"
);
const shareBtn = document.getElementById("share-btn");

// Event listeners
document.querySelectorAll(".view-pdf").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const pdfUrl = this.getAttribute("data-pdf-url");
    const title = this.getAttribute("data-title");
    openPdfModal(pdfUrl, title);
  });
});
document.querySelector(".close-modal").addEventListener("click", closePdfModal);
document
  .getElementById("prev-page")
  .addEventListener("click", goToPreviousPage);
document.getElementById("next-page").addEventListener("click", goToNextPage);
document.getElementById("zoom-in").addEventListener("click", zoomIn);
document.getElementById("zoom-out").addEventListener("click", zoomOut);
document.getElementById("crop-btn").addEventListener("click", toggleCrop);
document.getElementById("share-btn").addEventListener("click", showShareModal);
document
  .getElementById("download-btn")
  .addEventListener("click", downloadCroppedImage);
document
  .getElementById("share-wa-btn")
  .addEventListener("click", shareOnWhatsApp);
document
  .getElementById("close-share-btn")
  .addEventListener("click", closeShareModal);

async function openPdfModal(pdfUrl, title) {
  pdfModal.style.display = "block";
  document.body.style.overflow = "hidden";
  document.getElementById("current-page").textContent = "1";
  document.title = title + " | దక్షిణాది";
  shareBtn.style.display = "none";

  pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
  document.getElementById("total-pages").textContent = pdfDoc.numPages;
  renderPage(1);
}

function closePdfModal() {
  pdfModal.style.display = "none";
  document.body.style.overflow = "auto";
  if (jcropInstance) {
    jcropInstance.destroy();
    jcropInstance = null;
  }
  document.title = "EPDC";
  pdfImage.style.display = "none";
  shareBtn.style.display = "none";
}

async function renderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
    return;
  }
  pageRendering = true;
  pageNum = num;
  document.getElementById("current-page").textContent = num;

  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: scale });
  tempCanvas = document.createElement("canvas");
  const ctx = tempCanvas.getContext("2d");
  tempCanvas.width = viewport.width;
  tempCanvas.height = viewport.height;

  const renderContext = { canvasContext: ctx, viewport: viewport };
  await page.render(renderContext).promise;

  pdfImage.src = tempCanvas.toDataURL("image/png");
  pdfImage.style.display = "block";
  pdfImage.style.maxWidth = "100%";
  pdfImage.style.height = "auto";

  pageRendering = false;
  if (pageNumPending !== null) {
    renderPage(pageNumPending);
    pageNumPending = null;
  }
  if (jcropInstance) {
    jcropInstance.destroy();
    jcropInstance = null;
    shareBtn.style.display = "none";
  }
}

function goToPreviousPage() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function goToNextPage() {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function zoomIn() {
  scale *= 1.25;
  queueRenderPage(pageNum);
}

function zoomOut() {
  scale *= 0.8;
  if (scale < 0.25) scale = 0.25;
  queueRenderPage(pageNum);
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function toggleCrop() {
  if (!jcropInstance) {
    jcropInstance = Jcrop.attach(pdfImage, { multi: false });
    document.getElementById("share-btn").style.display = "block";

    const imgWidth = pdfImage.naturalWidth;
    const imgHeight = pdfImage.naturalHeight;
    const defaultWidth = imgWidth * 0.25;
    const defaultHeight = imgHeight * 0.25;

    jcropInstance.newWidget({
      x: 50,
      y: 50,
      w: defaultWidth,
      h: defaultHeight,
    });

    // jcropInstance.listen("crop.change", (widget) => {
    //   if (widget.active && widget.pos.w > 10 && widget.pos.h > 10) {
    //     shareBtn.style.display = "block";
    //   } else {
    //     shareBtn.style.display = "none";
    //   }
    // });

    jcropInstance.listen("crop.start", () => {
      shareBtn.style.display = "block";
    });

    document.getElementById("crop-btn").style.backgroundColor = "#ffc107";
    document.getElementById("crop-btn").style.color = "#000";
  } else {
    jcropInstance.destroy();
    jcropInstance = null;
    document.getElementById("crop-btn").style.backgroundColor = "#9acd32";
    document.getElementById("crop-btn").style.color = "#fff";
    shareBtn.style.display = "none";
  }
}

function showShareModal() {
  if (!jcropInstance || !jcropInstance.active) {
    alert("Please select a crop area first.");
    return;
  }

  const crop = jcropInstance.active.pos;
  const displayWidth = pdfImage.clientWidth; // Displayed width of the image
  const displayHeight = pdfImage.clientHeight; // Displayed height of the image
  const naturalWidth = pdfImage.naturalWidth; // Original width of the image
  const naturalHeight = pdfImage.naturalHeight; // Original height of the image

  // Calculate scaling factors between displayed image and original canvas
  const scaleX = tempCanvas.width / displayWidth;
  const scaleY = tempCanvas.height / displayHeight;

  // Adjust crop coordinates to match the original canvas dimensions
  const cropLeft = Math.round(crop.x * scaleX);
  const cropTop = Math.round(crop.y * scaleY);
  const cropWidth = Math.round(crop.w * scaleX);
  const cropHeight = Math.round(crop.h * scaleY);

  if (cropWidth <= 0 || cropHeight <= 0) {
    alert("Invalid crop area. Please select a valid region.");
    return;
  }

  const scaleFactor = 4; // For high-resolution output
  const topTextHeight = 40;
  const bottomTextHeight = 50;

  const tempCanvasCrop = document.createElement("canvas");
  const tempCtx = tempCanvasCrop.getContext("2d");
  tempCanvasCrop.width = cropWidth * scaleFactor;
  tempCanvasCrop.height =
    (cropHeight + topTextHeight + bottomTextHeight) * scaleFactor;
  tempCtx.scale(scaleFactor, scaleFactor);
  tempCtx.imageSmoothingEnabled = false;

  tempCtx.fillStyle = "white";
  tempCtx.fillRect(
    0,
    0,
    cropWidth,
    cropHeight + topTextHeight + bottomTextHeight
  );
  tempCtx.drawImage(
    tempCanvas,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    topTextHeight,
    cropWidth,
    cropHeight
  );

  tempCtx.font = "bold 24px Arial";
  tempCtx.fillStyle = "#729c1e";
  tempCtx.textAlign = "center";
  tempCtx.fillText("దక్షిణాది", cropWidth / 2, 30);

  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  tempCtx.font = "12px Arial";
  tempCtx.fillStyle = "#666";
  tempCtx.fillText(
    `${currentDate} | Page: ${pageNum}`,
    cropWidth / 2,
    topTextHeight + cropHeight + 20
  );
  tempCtx.fillText(
    "Source: https://dakshinadi.epdcindia.com/",
    cropWidth / 2,
    topTextHeight + cropHeight + 40
  );

  const img = new Image();
  img.src = tempCanvasCrop.toDataURL("image/png", 1.0);
  img.style.width = `${cropWidth}px`;
  img.style.height = `${cropHeight + topTextHeight + bottomTextHeight}px`;
  croppedImageContainer.innerHTML = "";
  croppedImageContainer.appendChild(img);
  shareModal.style.display = "block";
}

function closeShareModal() {
  shareModal.style.display = "none";
}

function downloadCroppedImage() {
  const img = croppedImageContainer.querySelector("img");
  if (img) {
    const link = document.createElement("a");
    link.download = "dakshinadhi-cropped-" + new Date().getTime() + ".png";
    link.href = img.src;
    link.click();
  }
}

function shareOnWhatsApp() {
  const img = croppedImageContainer.querySelector("img");
  if (img) {
    fetch(img.src)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File(
          [blob],
          "dakshinadhi-cropped-" + new Date().getTime() + ".png",
          { type: "image/png" }
        );
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          navigator
            .share({
              files: [file],
              title: "దక్షిణాది",
              text: "Check out this clipping from దక్షిణాది",
            })
            .catch((error) => fallbackWhatsAppShare(img.src));
        } else {
          fallbackWhatsAppShare(img.src);
        }
      })
      .catch((error) => fallbackWhatsAppShare(img.src));
  }
}

function fallbackWhatsAppShare(imageSrc) {
  const text = "Check out this clipping from దక్షిణాది:";
  const url = `https://wa.me/?text=${encodeURIComponent(
    text
  )}%0A%0A${encodeURIComponent(imageSrc)}`;
  window.open(url, "_blank");
}

window.addEventListener("resize", function () {
  if (pdfDoc) {
    renderPage(pageNum);
  }
});
