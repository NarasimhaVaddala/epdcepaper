let datepicker = document.getElementById("date-picker");

const todayDate = new Date();

// Function to format the date in a readable format
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is zero-based
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Loop to generate previous 7 days
for (let i = 1; i <= 7; i++) {
  let optionDate = new Date(todayDate);
  optionDate.setDate(todayDate.getDate() - i); // Set to previous day
  let formattedDate = formatDate(optionDate);

  let option = document.createElement("option");
  option.value = formattedDate;
  option.textContent = formattedDate;

  datepicker.appendChild(option);
}

// Global variable to track our dynamic edition card
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
      // Remove the dynamic card if no data found
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

  // Create the card if it doesn't exist
  if (!dynamicEditionCard) {
    dynamicEditionCard = document.createElement("div");
    dynamicEditionCard.className = "edition-card dynamic-edition";
    dynamicEditionCard.style.width = "30%";
    dynamicEditionCard.style.marginLeft = "0";

    dynamicEditionCard.innerHTML = `
      <a href="#" class="view-pdf">
        <img src="" alt="" />
      </a>
      <div class="edition-title"></div>
    `;

    // Insert after the original card
    const originalCard = document.querySelector(
      ".edition-card:not(.dynamic-edition)"
    );
    editionContainer.insertBefore(dynamicEditionCard, originalCard.nextSibling);

    // Bind click event
    dynamicEditionCard
      .querySelector(".view-pdf")
      .addEventListener("click", function (e) {
        e.preventDefault();
        const pdfUrl = this.getAttribute("data-pdf-url");
        const title = this.getAttribute("data-title");
        openPdfModal(pdfUrl, title);
      });
  }

  // Update the card content
  const pdfLink = dynamicEditionCard.querySelector(".view-pdf");
  const editionImage = dynamicEditionCard.querySelector("img");
  const editionTitle = dynamicEditionCard.querySelector(".edition-title");

  pdfLink.setAttribute("data-pdf-url", epaper.edition1PdfFile);
  pdfLink.setAttribute("data-title", epaper.edition1Title || "");
  editionImage.src = epaper.edition1Image;
  editionImage.alt = epaper.edition1Title || "Edition Image";
  editionTitle.textContent = epaper.edition1Title || "";
}
// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
let pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  scale = 1.0,
  ctx = null,
  canvas = null,
  isCropping = false,
  startX,
  startY,
  endX,
  endY,
  isDrawing = false;
// DOM elements
const pdfModal = document.getElementById("pdf-modal");
const pdfViewerContainer = document.getElementById("pdf-viewer-container");
const pdfCanvas = document.getElementById("pdf-canvas");
const cropOverlay = document.getElementById("crop-overlay");
const watermark = document.getElementById("watermark");
const shareModal = document.getElementById("share-modal");
const croppedImageContainer = document.getElementById(
  "cropped-image-container"
);
// Open PDF modal when edition is clicked
document.querySelectorAll(".view-pdf").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const pdfUrl = this.getAttribute("data-pdf-url");
    const title = this.getAttribute("data-title");
    openPdfModal(pdfUrl, title);
  });
});
// Close modal
document.querySelector(".close-modal").addEventListener("click", closePdfModal);
// Toolbar buttons
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
// Mouse events for cropping
pdfViewerContainer.addEventListener("mousedown", startCrop);
pdfViewerContainer.addEventListener("mousemove", drawCrop);
pdfViewerContainer.addEventListener("mouseup", endCrop);
pdfViewerContainer.addEventListener("dblclick", preventDoubleClick);
// Touch events for mobile
pdfViewerContainer.addEventListener("touchstart", handleTouchStart, {
  passive: false,
});
pdfViewerContainer.addEventListener("touchmove", handleTouchMove, {
  passive: false,
});
pdfViewerContainer.addEventListener("touchend", handleTouchEnd);
function preventDoubleClick(e) {
  if (isCropping) {
    e.preventDefault();
  }
}
function openPdfModal(pdfUrl, title) {
  pdfModal.style.display = "block";
  document.body.style.overflow = "hidden";
  document.getElementById("current-page").textContent = "1";
  document.title = title + " | దక్ణాది";

  // Reset cropping state
  isCropping = false;
  isDrawing = false;
  document.getElementById("crop-btn").style.backgroundColor = "#9acd32";
  document.getElementById("crop-btn").style.color = "#fff";
  cropOverlay.style.display = "none";
  document.getElementById("share-btn").style.display = "none";

  // Load the PDF
  pdfjsLib
    .getDocument(pdfUrl)
    .promise.then(function (pdfDoc_) {
      pdfDoc = pdfDoc_;
      document.getElementById("total-pages").textContent = pdfDoc.numPages;

      // Initialize canvas with high DPI
      canvas = document.getElementById("pdf-canvas");
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      ctx = canvas.getContext("2d");
      ctx.scale(devicePixelRatio, devicePixelRatio); // Scale context for high-DPI rendering
      ctx.imageSmoothingEnabled = false; // Disable smoothing for sharper edges

      // Render the first page
      renderPage(1);
    })
    .catch(function (error) {
      console.error("Error loading PDF:", error);
      alert("Error loading PDF. Please try again.");
    });
}

function closePdfModal() {
  pdfModal.style.display = "none";
  document.body.style.overflow = "auto";
  isCropping = false;
  isDrawing = false;
  cropOverlay.style.display = "none";
  document.getElementById("share-btn").style.display = "none";
  document.title = "EPDC";
}

// Replace your existing renderPage function with this responsive version
function renderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
    return;
  }
  pageRendering = true;
  pageNum = num;

  // Update page display
  document.getElementById("current-page").textContent = num;

  pdfDoc.getPage(num).then(function (page) {
    // Get the container dimensions
    const container = pdfViewerContainer;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate the appropriate scale to fit the page
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      (containerWidth - 20) / viewport.width, // -20 for padding
      (containerHeight - 20) / viewport.height
    );

    // Apply the user's zoom level
    const finalScale = scale * window.devicePixelRatio * (window.scale || 1);

    // Get the scaled viewport
    const scaledViewport = page.getViewport({ scale: finalScale });

    // Set canvas dimensions
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Adjust canvas display size for proper scaling
    canvas.style.width = `${scaledViewport.width / window.devicePixelRatio}px`;
    canvas.style.height = `${
      scaledViewport.height / window.devicePixelRatio
    }px`;

    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport,
    };

    const renderTask = page.render(renderContext);
    renderTask.promise.then(function () {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
}

function goToPreviousPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

function goToNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

function zoomIn() {
  window.scale = (window.scale || 1) * 1.25;
  queueRenderPage(pageNum);
}

function zoomOut() {
  window.scale = (window.scale || 1) * 0.8;
  if (window.scale < 0.25) window.scale = 0.25;
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
  isCropping = !isCropping;
  if (isCropping) {
    document.getElementById("crop-btn").style.backgroundColor = "#ffc107";
    document.getElementById("crop-btn").style.color = "#000";
    cropOverlay.style.display = "none";
  } else {
    document.getElementById("crop-btn").style.backgroundColor = "#9acd32";
    document.getElementById("crop-btn").style.color = "#fff";
    cropOverlay.style.display = "none";
    document.getElementById("share-btn").style.display = "none";
  }
}

// / Update the startCrop function
function startCrop(e) {
  if (!isCropping) return;
  e.preventDefault();
  isDrawing = true;

  const coords = getAdjustedCoordinates(
    e.clientX || e.touches[0].clientX,
    e.clientY || e.touches[0].clientY
  );

  startX = coords.x;
  startY = coords.y;

  // Set overlay position (in display pixels)
  const displayX = startX / (canvas.width / parseFloat(canvas.style.width));
  const displayY = startY / (canvas.height / parseFloat(canvas.style.height));

  cropOverlay.style.left = displayX + "px";
  cropOverlay.style.top = displayY + "px";
  cropOverlay.style.width = "0px";
  cropOverlay.style.height = "0px";
  cropOverlay.style.display = "block";
}

// Update the drawCrop function
function drawCrop(e) {
  if (!isCropping || !isDrawing) return;
  e.preventDefault();

  const coords = getAdjustedCoordinates(
    e.clientX || e.touches[0].clientX,
    e.clientY || e.touches[0].clientY
  );

  endX = coords.x;
  endY = coords.y;

  // Calculate display dimensions for the overlay
  const displayScaleX = canvas.width / parseFloat(canvas.style.width);
  const displayScaleY = canvas.height / parseFloat(canvas.style.height);

  const displayWidth = Math.abs(endX - startX) / displayScaleX;
  const displayHeight = Math.abs(endY - startY) / displayScaleY;

  cropOverlay.style.width = displayWidth + "px";
  cropOverlay.style.height = displayHeight + "px";

  if (endX < startX) {
    cropOverlay.style.left = endX / displayScaleX + "px";
  }
  if (endY < startY) {
    cropOverlay.style.top = endY / displayScaleY + "px";
  }
}
function endCrop(e) {
  if (!isCropping || !isDrawing) return;
  e.preventDefault();
  isDrawing = false;
  const rect = pdfViewerContainer.getBoundingClientRect();
  const scrollLeft = pdfViewerContainer.scrollLeft;
  const scrollTop = pdfViewerContainer.scrollTop;
  endX = e.clientX - rect.left + scrollLeft;
  endY = e.clientY - rect.top + scrollTop;
  // Final boundary checks
  endX = Math.max(0, Math.min(endX, canvas.width));
  endY = Math.max(0, Math.min(endY, canvas.height));
  // Ensure we have a valid crop area (at least 50x50 pixels)
  if (Math.abs(endX - startX) > 50 && Math.abs(endY - startY) > 50) {
    document.getElementById("share-btn").style.display = "block";
  } else {
    // If the crop area is too small, hide it
    cropOverlay.style.display = "none";
    document.getElementById("share-btn").style.display = "none";
  }
}
// Touch event handlers
function handleTouchStart(e) {
  if (!isCropping) return;
  e.preventDefault();
  isDrawing = true;
  const touch = e.touches[0];
  const rect = pdfViewerContainer.getBoundingClientRect();
  const scrollLeft = pdfViewerContainer.scrollLeft;
  const scrollTop = pdfViewerContainer.scrollTop;
  startX = touch.clientX - rect.left + scrollLeft;
  startY = touch.clientY - rect.top + scrollTop;
  cropOverlay.style.left = startX + "px";
  cropOverlay.style.top = startY + "px";
  cropOverlay.style.width = "0px";
  cropOverlay.style.height = "0px";
  cropOverlay.style.display = "block";
}
function handleTouchMove(e) {
  if (!isCropping || !isDrawing) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = pdfViewerContainer.getBoundingClientRect();
  const scrollLeft = pdfViewerContainer.scrollLeft;
  const scrollTop = pdfViewerContainer.scrollTop;
  endX = touch.clientX - rect.left + scrollLeft;
  endY = touch.clientY - rect.top + scrollTop;
  // Boundary checks
  endX = Math.max(0, Math.min(endX, canvas.width));
  endY = Math.max(0, Math.min(endY, canvas.height));
  const width = endX - startX;
  const height = endY - startY;
  cropOverlay.style.width = Math.abs(width) + "px";
  cropOverlay.style.height = Math.abs(height) + "px";
  if (width < 0) {
    cropOverlay.style.left = endX + "px";
  }
  if (height < 0) {
    cropOverlay.style.top = endY + "px";
  }
}
function handleTouchEnd(e) {
  if (!isCropping || !isDrawing) return;
  e.preventDefault();
  isDrawing = false;
  if (e.changedTouches && e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const rect = pdfViewerContainer.getBoundingClientRect();
    const scrollLeft = pdfViewerContainer.scrollLeft;
    const scrollTop = pdfViewerContainer.scrollTop;
    endX = touch.clientX - rect.left + scrollLeft;
    endY = touch.clientY - rect.top + scrollTop;
    // Final boundary checks
    endX = Math.max(0, Math.min(endX, canvas.width));
    endY = Math.max(0, Math.min(endY, canvas.height));
    // Ensure we have a valid crop area (at least 50x50 pixels)
    if (Math.abs(endX - startX) > 50 && Math.abs(endY - startY) > 50) {
      document.getElementById("share-btn").style.display = "block";
    } else {
      // If the crop area is too small, hide it
      cropOverlay.style.display = "none";
      document.getElementById("share-btn").style.display = "none";
    }
  }
}
function showShareModal() {
  // Get the crop coordinates using precise values
  const cropLeft = parseFloat(cropOverlay.style.left.replace("px", "")) || 0;
  const cropTop = parseFloat(cropOverlay.style.top.replace("px", "")) || 0;
  const cropWidth = parseFloat(cropOverlay.style.width.replace("px", "")) || 0;
  const cropHeight =
    parseFloat(cropOverlay.style.height.replace("px", "")) || 0;

  // Create high-resolution canvas
  const scaleFactor = 4; // Double resolution for crisp text
  const topTextHeight = 40;
  const bottomTextHeight = 50;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // Set canvas dimensions with scaling
  tempCanvas.width = cropWidth * scaleFactor;
  tempCanvas.height =
    (cropHeight + topTextHeight + bottomTextHeight) * scaleFactor;

  // Scale context for high-DPI rendering
  tempCtx.scale(scaleFactor, scaleFactor);
  tempCtx.imageSmoothingEnabled = false;

  // Add white background
  tempCtx.fillStyle = "white";
  tempCtx.fillRect(
    0,
    0,
    cropWidth,
    cropHeight + topTextHeight + bottomTextHeight
  );

  // Draw cropped image with precise  s
  tempCtx.drawImage(
    canvas,
    Math.floor(cropLeft), // Align to pixel grid
    Math.floor(cropTop),
    Math.ceil(cropWidth),
    Math.ceil(cropHeight),
    0,
    topTextHeight,
    cropWidth,
    cropHeight
  );

  // Add crisp text elements
  tempCtx.font = "bold 24px Arial";
  tempCtx.fillStyle = "#729c1e";
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "top"; // Ensure consistent baseline

  // Calculate text positions with pixel alignment
  const mainTextY = Math.round(30);
  tempCtx.fillText("దక్షిణాది", cropWidth / 2, mainTextY);

  // Add date and source with precise positioning
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  tempCtx.font = "12px Arial";
  tempCtx.fillStyle = "#666";

  const dateTextY = Math.round(topTextHeight + cropHeight + 20);
  tempCtx.fillText(
    `${formattedDate}  | Page : ${pageNum}`,
    cropWidth / 2,
    dateTextY
  );

  const sourceTextY = Math.round(topTextHeight + cropHeight + 40);
  tempCtx.fillText(
    "Source :https:dakshinadi.epdcindia.com/",
    cropWidth / 2,
    sourceTextY
  );

  // Create final image with proper scaling
  const img = new Image();
  img.src = tempCanvas.toDataURL("image/png", 1.0);
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
    // Create a temporary link to download the image first
    const link = document.createElement("a");
    link.download = "dakshinadhi-cropped-" + new Date().getTime() + ".png";
    link.href = img.src;
    // Create a Blob from the image data
    fetch(img.src)
      .then((res) => res.blob())
      .then((blob) => {
        // Create a file object
        const file = new File([blob], link.download, {
          type: "image/png",
        });
        // Check if the Web Share API is available (for mobile devices)
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
            .catch((error) => {
              console.log("Sharing failed", error);
              fallbackWhatsAppShare(img.src);
            });
        } else {
          // Fallback for desktop or browsers that don't support sharing files
          fallbackWhatsAppShare(img.src);
        }
      })
      .catch((error) => {
        console.error("Error creating shareable file:", error);
        fallbackWhatsAppShare(img.src);
      });
  }
}
function fallbackWhatsAppShare(imageSrc) {
  // For browsers that don't support file sharing
  const text = "Check out this clipping from దక్షిణాది:";
  const url = `https://wa.me/?text=${encodeURIComponent(
    text
  )}%0A%0A${encodeURIComponent(imageSrc)}`;
  window.open(url, "_blank");
}

function getAdjustedCoordinates(clientX, clientY) {
  const rect = pdfViewerContainer.getBoundingClientRect();
  const scrollLeft = pdfViewerContainer.scrollLeft;
  const scrollTop = pdfViewerContainer.scrollTop;

  // Calculate the scaling factor between the canvas display size and actual size
  const scaleX = canvas.width / parseFloat(canvas.style.width);
  const scaleY = canvas.height / parseFloat(canvas.style.height);

  return {
    x: (clientX - rect.left + scrollLeft) * scaleX,
    y: (clientY - rect.top + scrollTop) * scaleY,
  };
}

let resizeTimer;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, 250);
});
