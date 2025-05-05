const allowedEmail = "asheharyar269@gmail.com";
const allowedPassword = "1122";
const animationDuration = 300; // Match CSS transition duration in milliseconds

// --- LOGIN/LOGOUT (Handle Dashboard Visibility Animation) ---
function loginUser() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const loginError = document.getElementById('loginError');
  const dashboard = document.getElementById('dashboard');
  const loginSection = document.getElementById('loginSection');

  loginError.textContent = '';

  if (!email || !password) {
    loginError.textContent = "Please enter both email and password.";
    return;
  }

  if (email === allowedEmail && password === allowedPassword) {
    loginSection.classList.add('d-none'); // Hide login immediately

    // Prepare dashboard for fade-in
    dashboard.classList.add('hidden'); // Start hidden
    dashboard.classList.remove('d-none'); // Make it part of layout but invisible

    // Force reflow/repaint before adding visible class - essential!
    void dashboard.offsetWidth;

    dashboard.classList.remove('hidden'); // Trigger fade-in via CSS transition

    loginError.textContent = '';
    localStorage.setItem('isLoggedIn', 'true');
    displayFiles();
  } else {
    loginError.textContent = "Invalid email or password!";
  }
}

function logoutUser() {
  const dashboard = document.getElementById('dashboard');
  const loginSection = document.getElementById('loginSection');

  dashboard.classList.add('hidden'); // Start fade-out (optional, can just hide)

  // Wait for fade-out before hiding completely (optional)
  // setTimeout(() => {
    dashboard.classList.add('d-none');
    loginSection.classList.remove('d-none'); // Show login
  // }, 500); // Match CSS transition duration if dashboard fade-out is desired

  // Clear fields and state
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('titleSearch').value = '';
  document.getElementById('fileNameSearch').value = '';
  document.getElementById('dateSearch').value = '';
  localStorage.removeItem('isLoggedIn');
}


// --- UPLOAD FILE (Handle Card Entry Animation) ---
function uploadFile() {
    const titleInput = document.getElementById('fileTitle');
    const fileInput = document.getElementById('fileInput');
    const uploadError = document.getElementById('uploadError');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    uploadError.style.display = 'none';

    if (!title) {
      uploadError.textContent = "Please enter a title for the file.";
      uploadError.style.display = 'block';
      return;
    }
    if (!file) {
      uploadError.textContent = "Please select a file to upload.";
      uploadError.style.display = 'block';
      return;
    }
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      uploadError.textContent = `File size exceeds ${maxSizeMB}MB limit.`;
      uploadError.style.display = 'block';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const fileData = {
        id: Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: title, 
        fileName: file.name, 
        fileType: file.type,
        uploadDate: new Date().toISOString().split('T')[0],
        dataUrl: e.target.result, 
        size: file.size, 
        lastModified: file.lastModified
      };

      try {
        saveFileToLocal(fileData);
        addFileCardWithAnimation(fileData);
        titleInput.value = '';
        fileInput.value = null;
        checkIfFilesExist();
      } catch (saveError) {
        console.error("Upload failed due to storage error:", saveError);
        if (uploadError.style.display === 'none') {
             uploadError.textContent = "Failed to save the file. Storage might be full.";
             uploadError.style.display = 'block';
        }
      }
    };
    reader.onerror = function () {
      uploadError.textContent = "Error reading file.";
      uploadError.style.display = 'block';
    }
    reader.readAsDataURL(file);
}

// --- ADD FILE CARD (Handles rendering & triggers entry animation) ---
function addFileCardWithAnimation(fileData) {
    const fileList = document.getElementById("fileList");
    if (!fileList) return;

    const escapedTitle = escapeHtml(fileData.title);
    const titleForDataAttr = fileData.title.toLowerCase();
    const fileNameForDataAttr = fileData.fileName.toLowerCase();
    const fileSize = formatFileSize(fileData.size || 0);
    let displayDate = 'Invalid Date';
    
    try {
        const dateObj = new Date(fileData.uploadDate + 'T00:00:00Z');
        if (!isNaN(dateObj)) {
            displayDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (e) { console.error("Error parsing date:", fileData.uploadDate, e); }

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = `
      <div class='col file-card file-card-entering' 
           data-id="${fileData.id}" 
           data-title="${titleForDataAttr}" 
           data-file-name="${fileNameForDataAttr}"
           data-upload-date="${fileData.uploadDate}" 
           data-file-type="${fileData.fileType}">
        <div class='card p-3 shadow-sm h-100 d-flex flex-column'>
          ${fileData.fileType.startsWith("image/") && fileData.dataUrl
        ? `<img src="${fileData.dataUrl}" class="file-preview-img" alt="${escapedTitle} preview" loading="lazy"/>`
        : `<div class="file-placeholder-wrapper text-center flex-grow-1 d-flex align-items-center justify-content-center">
              <i class="bi bi-file-earmark-text file-placeholder"></i>
           </div>`}
          <div class="file-info mt-auto pt-2">
            <h6 class="card-title mb-1 text-truncate" title="${escapedTitle}">${escapedTitle}</h6>
            <p class="card-text mb-1" style="font-size: 0.8em;"><small class="text-truncate d-block">Filename: ${escapeHtml(fileData.fileName)}</small></p>
            <p class="card-text mb-1" style="font-size: 0.8em;"><small>Size: ${fileSize}</small></p>
            <p class="card-text mb-2" style="font-size: 0.8em;"><small>Uploaded: ${displayDate}</small></p>
          </div>
          <button class="btn btn-sm btn-outline-danger mt-2 align-self-start" onclick="deleteFileWithAnimation(this, '${fileData.id}')">
            <i class="bi bi-trash me-1"></i>Delete
          </button>
        </div>
      </div>`.trim();

    const cardElement = tempContainer.firstChild;
    fileList.appendChild(cardElement);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
             if (cardElement) {
                 cardElement.classList.remove('file-card-entering');
             }
        });
    });

    const noFilesMessage = document.getElementById('noFilesMessage');
    if (noFilesMessage) {
        noFilesMessage.style.display = 'none';
    }
}

// --- DELETE FILE (Handle Card Exit Animation) ---
function deleteFileWithAnimation(button, fileId) {
  if (!confirm('Are you sure you want to delete this file?')) {
      return;
  }

  const cardToRemove = button.closest('.file-card');
  if (!cardToRemove) return;

  cardToRemove.classList.add('file-card-exiting');

  setTimeout(() => {
      let storedFiles = getFilesFromLocalStorage();
      const originalLength = storedFiles.length;
      storedFiles = storedFiles.filter(file => String(file.id) !== String(fileId));

      if (storedFiles.length < originalLength) {
          try {
              localStorage.setItem('secureFiles', JSON.stringify(storedFiles));
              console.log("File removed from storage:", fileId);
          } catch (e) {
              console.error("Error updating localStorage after deletion:", e);
              alert("Could not update storage after deleting the file. Please try again.");
              cardToRemove.classList.remove('file-card-exiting');
              return;
          }
      } else {
          console.warn("File ID not found in storage during deletion:", fileId);
      }

      cardToRemove.remove();
      checkIfFilesExist();
  }, animationDuration);
}

// --- DISPLAY FILES ---
function displayFiles() {
    const storedFiles = getFilesFromLocalStorage();
    const fileList = document.getElementById("fileList");
    if (!fileList) return;

    fileList.innerHTML = '';
    storedFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    if (storedFiles.length > 0) {
        storedFiles.forEach(fileData => {
             addFileCardWithAnimation(fileData);
        });
    }

    searchFiles();
    checkIfFilesExist();
}

// --- SEARCH FILES (Updated with file name search) ---
function searchFiles() {
  const titleQuery = document.getElementById('titleSearch').value.toLowerCase().trim();
  const fileNameQuery = document.getElementById('fileNameSearch').value.toLowerCase().trim();
  const dateQuery = document.getElementById('dateSearch').value;
  const fileCards = document.querySelectorAll('#fileList .file-card:not(.file-card-exiting)');
  let matchFound = false;

  fileCards.forEach(card => {
    const cardTitle = card.getAttribute('data-title') || '';
    const cardFileName = card.getAttribute('data-file-name') || '';
    const cardDate = card.getAttribute('data-upload-date') || '';

    const titleMatch = !titleQuery || cardTitle.includes(titleQuery);
    const fileNameMatch = !fileNameQuery || cardFileName.includes(fileNameQuery);
    const dateMatch = !dateQuery || cardDate === dateQuery;

    if (titleMatch && fileNameMatch && dateMatch) {
      card.style.display = '';
      matchFound = true;
    } else {
      card.style.display = 'none';
    }
  });

  checkIfFilesExist(!matchFound && (titleQuery || fileNameQuery || dateQuery));
}

// Helper functions
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, "")
      .replace(/'/g, "'");
}

function getFilesFromLocalStorage() {
    try {
      const storedData = localStorage.getItem('secureFiles');
      return storedData ? JSON.parse(storedData) : [];
    } catch (e) {
      console.error("Error reading files from localStorage:", e);
      return [];
    }
}

function formatFileSize(bytes) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, index)).toFixed(2)) + ' ' + sizes[index];
}

function saveFileToLocal(fileData) {
    const storedFiles = getFilesFromLocalStorage();
    storedFiles.push(fileData);
    try {
      localStorage.setItem('secureFiles', JSON.stringify(storedFiles));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert("Storage limit exceeded! Cannot save the file. Please remove older files or use smaller ones.");
        storedFiles.pop();
      } else {
        alert("An error occurred while saving data. Check the console.");
      }
      throw e;
    }
}

function checkIfFilesExist(noMatchDueToFilter = false) {
    const fileList = document.getElementById("fileList");
    const noFilesMessage = document.getElementById('noFilesMessage');
    if (!fileList || !noFilesMessage) return;

    const visibleFileCards = fileList.querySelectorAll('.file-card:not([style*="display: none"]):not(.file-card-exiting)');

    if (visibleFileCards.length === 0) {
      noFilesMessage.style.display = 'block';
      const totalFiles = getFilesFromLocalStorage().length;
      if (totalFiles === 0) {
          noFilesMessage.querySelector('p').textContent = 'No files uploaded yet.';
      } else if (noMatchDueToFilter) {
          noFilesMessage.querySelector('p').textContent = 'No files match your search criteria.';
      } else {
           noFilesMessage.querySelector('p').textContent = 'No files to display.';
      }
    } else {
      noFilesMessage.style.display = 'none';
    }
}

// --- Initialize the page ---
document.addEventListener('DOMContentLoaded', function() {
    const dashboard = document.getElementById('dashboard');
    const loginSection = document.getElementById('loginSection');

    if (localStorage.getItem('isLoggedIn') === 'true') {
        loginSection.classList.add('d-none');
        dashboard.classList.remove('d-none');
        dashboard.classList.remove('hidden');
        displayFiles();
    } else {
        loginSection.classList.remove('d-none');
        dashboard.classList.add('d-none');
        dashboard.classList.add('hidden');
    }

    const titleSearchInput = document.getElementById('titleSearch');
    const fileNameSearchInput = document.getElementById('fileNameSearch');
    const dateSearchInput = document.getElementById('dateSearch');

    if (titleSearchInput) titleSearchInput.addEventListener('input', searchFiles);
    if (fileNameSearchInput) fileNameSearchInput.addEventListener('input', searchFiles);
    if (dateSearchInput) dateSearchInput.addEventListener('change', searchFiles);
});