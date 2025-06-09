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
        <td>${item.quantity}</td>
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
                let row = document.createElement('tr');

                // نام محصول رو داخل یک td که کلیک‌پذیر است
                row.innerHTML = `
                    <td class="editable" data-barcode="${item.barcode}">${item.name || "no name"}</td>
                    <td>${item.quantity}</td>
                    <td>${item.barcode}</td>
                `;

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

function removeItem() {
    const barcode = document.getElementById('barcode').value.trim();  // حذف فاصله اضافی
    console.log(JSON.stringify({ 'barcode': barcode, action: 'remove' }));

    if (!barcode) {
        alert("Please Enter barcode!");
        return;
    }

    fetch('/removeItem', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'barcode': barcode, action: 'remove' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            alert("removed successfully!");
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
        console.error('Error deleting product:', error);
        alert("Error!");
    });
}

function toggleDoorOptions() {
    const options = document.getElementById('door-options');
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
}

function sendDoorState(isOpen) {
    fetch('/door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: isOpen })
    })
    .then(res => res.json())
    .then(data => {
        alert("The door" + (isOpen ? "Opened" : "Closed"));
        document.getElementById('door-options').style.display = 'none';
    })
    .catch(err => {
        console.error("خطا در ارسال وضعیت در:", err);
        alert("خطا در ارتباط با در!");
    });
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

window.onload = () => {
  getInventory();
  initInventorySocket();
  initEnvSocket();

  // Check after a short delay so sockets have time to connect
  setTimeout(checkSockets, 1500);
};