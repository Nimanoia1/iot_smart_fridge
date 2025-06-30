function initEnvSocket() {
  envSocket = new WebSocket("ws://localhost:8000/ws/env");

  envSocket.onopen = () => {
    console.log("[WS] Connected to /ws/env");
  };

  envSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    let tempSpan = document.getElementById('temperature');
    let humiditySpan = document.getElementById('humidity');
    let doorSpan = document.getElementById('door_status');

    tempSpan.textContent = (data.temperature != null ? data.temperature + "°C" : "-");
    humiditySpan.textContent = (data.humidity != null ? data.humidity + "%" : "-");
    doorSpan.textContent = data.door_status ?? "-";
  };
}

function initInventorySocket() {
  inventorySocket = new WebSocket("ws://localhost:8000/ws/inventory");

  inventorySocket.onopen = () => {
    console.log("[WS] Connected to /ws/inventory");
  };

  inventorySocket.onerror = (event) => {
    console.error("[WS] WebSocket error on /ws/inventory", event);
  };

  inventorySocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "inventory_update") {
      updateInventoryTable(data.items);
    }
  };
}

function updateInventoryTable(items) {
  const tbody = document.querySelector("#inventory-table tbody");  // fix ID here
  tbody.innerHTML = ""; // Clear old rows

  items.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td class="editable" data-barcode="${item.barcode}">${item.name || "no name"}</td>
        <td background-color: #d55353>${item.quantity}</td>
        <td>${item.barcode}</td>
    `;

    tbody.appendChild(row);
  });
}


// تابع گرفتن موجودی و نمایش در جدول
function getInventory() {
    fetch('/inventory')
        .then(response => response.json())
        .then(data => {
            let tableBody = document.querySelector('#inventory-table tbody');
            tableBody.innerHTML = '';

            data.items.forEach(item => {
                //if (item.quantity <= 0) return;

                let row = document.createElement('tr');
                if(item.limit && item.limit > item.quantity){
                    row.innerHTML = `
                    <td style="background-color:#f08784;" class="editable" data-barcode="${item.barcode}">${item.name || "no name"}</td>                  
                    <td style="background-color:#f08784;" >${item.limit || "❌"}</td>
                    <td style="background-color:#f08784;" >${item.quantity}</td>
                    <td style="background-color:#f08784;">${item.barcode}</td>
                `;
                }
                else{
                    row.innerHTML = `
                    <td class="editable" data-barcode="${item.barcode}">${item.name || "no name"}</td>                  
                    <td>${item.limit || "❌"}</td>
                    <td>${item.quantity}</td>
                    <td>${item.barcode}</td>
                `;
                }

                tableBody.appendChild(row);
            });

            // اضافه کردن event listener به سلول‌های قابل ویرایش
            document.querySelectorAll('.editable').forEach(td => {
                td.addEventListener('click', () => {
                    makeEditable(td);
                });
            });
        })
        .catch(error => console.error('خطا در دریافت موجودی:', error));
}

function makeEditable(td) {
    // اگر قبلاً input وجود دارد، کاری نکن
    if (td.querySelector('input')) return;

    const oldValue = td.textContent;
    const barcode = td.getAttribute('data-barcode');

    td.innerHTML = `<input type="text" value="${oldValue}" />`;
    const input = td.querySelector('input');
    input.focus();

    input.addEventListener('blur', () => {
        const newValue = input.value.trim();
        if (newValue && newValue !== oldValue) {
            updateProductName(barcode, newValue, td);
        } else {
            td.textContent = oldValue;
        }
    });
     // برای حالت Enter
     input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
}
function updateProductName(barcode, newName, td) {
    fetch('/updateProductName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode, name: newName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'ok') {
            td.textContent = newName;
            alert('update successfuly');
        } else {
            td.textContent = data.oldName || ''; // برگشت به نام قدیمی
            alert('update error : ' + (data.message || 'unknown error '));
        }
    })
    .catch(error => {
        console.error('خطا در به‌روزرسانی نام محصول:', error);
        td.textContent = '';
        alert('خطا در ارتباط با سرور.');
    });
}

function updateItem(barcode, action) {
    fetch('/updateItem', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'barcode': barcode, 'action': action })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            getInventory();  // بروزرسانی جدول
            if (data.alert) {
                alert("⚠️ موجودی این کالا در حال اتمام است!");
            }  
        } 
        else if (data.status === "not_allowed") {
            alert(data.message || "این کالا موجودی نداره.");
        }
        else if (data.status === "not_found") {
            alert(data.message || "کالا پیدا نشد.");
        }
        else if (data.status === "invalid") {
            alert(data.message || "درخواست نامعتبر است.");
        }
        else {
            console.log("Response data:", data);                    
    }
    }
    )
    .catch(error => {
        console.error('Error Updating product:', error);
        alert("Error!");
    });
}

function updateLimit(barcode, limit) {
    fetch('/updateProductLimit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'barcode': barcode, 'limit': limit })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            getInventory();  // بروزرسانی جدول
            if (data.alert) {
                alert("⚠️ موجودی این کالا در حال اتمام است!");
            }  
        }
        else {
            console.log("Response data:", data);                    
        }
    }
    )
    .catch(error => {
        console.error('Error Updating product:', error);
    });
}

function openWifiModal() {
    document.getElementById("wifi-modal").style.display = "block";
    toggleSidebar(); // وقتی وای‌فای باز میشه منو هم بسته شه
}


function sendWifiConfig() {
    const ssid = document.getElementById('wifi-ssid').value;
    const password = document.getElementById('wifi-password').value;

    if (!ssid || !password) {
        alert("Please Enter Username/Password");
        return;
    }

    fetch('/wifi', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ wifi_ssid: ssid, wifi_password: password })
    })
    .then(res => res.json())
    .then(data => {
        closeWifiModal();
        alert("Wi-Fi Connected");
    })
    .catch(err => {
        console.error("خطا در ارسال Wi-Fi:", err);
        alert("خطا در ارسال!");
    });
}
// تابع بستن پنجره وای‌فای (modal)
function closeWifiModal() {
    document.getElementById("wifi-modal").style.display = "none";
}


function openDoorModal() { 
    let doorSpan = document.getElementById('door_status');
    const modal = document.getElementById("door-modal");
    const text = document.getElementById("door-state-text");
    const btn = document.getElementById("door-action-btn");

    modal.style.display = "block";

    if (doorSpan.textContent === "open") {
        text.textContent = "The Door is Open";
        btn.textContent = "Close the Door";
    } else if (doorSpan.textContent === "close") {
        text.textContent = "The Door is Closed";
        btn.textContent = "Open the Door";
    } else {
        text.textContent = "Unknown Door Status";
        btn.textContent = "Try Again";
    }
  
    toggleSidebar();
}

function closeDoorModal() {
    document.getElementById("door-modal").style.display = "none";
}

function handleDoorAction() {
    const desiredState = !currentDoorOpen;

    fetch("/door", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: desiredState })
    })
    .then(res => res.json())
    .then(data => {
        alert("Door" + (desiredState ? " Opened" : " Closed"));
        document.getElementById("door-modal").style.display = "none";
    })
    .catch(err => {
        alert("خطا در تغییر وضعیت در");
        console.error(err);
    });
}

function toggleMenu() {
    const menu = document.getElementById("dropdown-menu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

//=======================
function enableCellContextMenu() {
    const table = document.getElementById('inventory-table');
    const contextMenu = document.getElementById('contextMenu');
    let selectedRow = null;
    table.addEventListener('contextmenu', function (e) {    
        if (e.target.tagName.toLowerCase() !== 'td') return;

        e.preventDefault();
        selectedRow = e.target.closest('tr');

        contextMenu.style.top = e.pageY + "px";
        contextMenu.style.left = e.pageX + "px";
        contextMenu.style.display = 'block';
    });

    document.addEventListener('click', function () {
        contextMenu.style.display = 'none';
    });

    document.getElementById('addRow').addEventListener('click', function () {
        if (selectedRow) {
        const barcode = selectedRow.cells[3].innerText;
            updateItem(barcode,"add");
            //console.log(barcode)
        }
    });

    document.getElementById('removeRow').addEventListener('click', function () {
        if (selectedRow) {
            const barcode = selectedRow.cells[3].innerText;  
            updateItem(barcode,"remove");
            //console.log(barcode)
        }
    });

    document.getElementById('setLimit').addEventListener('click', function () {
        if (!selectedRow) return;
        const barcode = selectedRow.cells[3].innerText;
        const currentLimit = selectedRow.cells[1].innerText;

        showLimitModal(currentLimit, function (newLimit) {
            if (newLimit !== null) {
            //selectedRow.cells[1].innerText = newLimit;
            updateLimit(barcode,newLimit)
            }            
        });     
    });
}

function showLimitModal(defaultValue = '', callback) {
  const modal = document.getElementById('limitModal');
  const input = document.getElementById('limitInput');
  const btnOk = document.getElementById('limitOk');
  const btnCancel = document.getElementById('limitCancel');

  input.value = defaultValue;
  modal.style.display = 'flex';
  input.focus();

  function cleanup() {
    modal.style.display = 'none';
    btnOk.removeEventListener('click', onOk);
    btnCancel.removeEventListener('click', onCancel);
    modal.removeEventListener('click', onOutsideClick);
  }

  function onOk() {
    const val = input.value.trim();
    const num = parseInt(val, 10);
    if (val === '' || isNaN(num) || !Number.isInteger(num) || num < 0) {
      alert("Please enter a valid non-negative integer.");
      input.focus();
      return;
    }
    cleanup();
    callback(num);
  }

  function onCancel() {
    cleanup();
    callback(null);
  }

  function onOutsideClick(e) {
    if (e.target === modal) { // clicked outside modal-content
      cleanup();
      callback(null);
    }
  }

  btnOk.addEventListener('click', onOk);
  btnCancel.addEventListener('click', onCancel);
  modal.addEventListener('click', onOutsideClick);
}

//=========================

window.onload = () => {
  getInventory();
  initInventorySocket();
  initEnvSocket();
  enableCellContextMenu();
};