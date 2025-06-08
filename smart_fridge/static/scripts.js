function initSocket() {
  const socket = new WebSocket("ws://localhost:8000/ws/env");


  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    let tempSpan = document.getElementById('temperature');
    let humiditySpan = document.getElementById('humidity');
    let doorSpan = document.getElementById('door_status');

    tempSpan.textContent = data.temperature + "°C" ?? "-" ;
    humiditySpan.textContent = data.humidity + "%" ?? "-" ;
    doorSpan.textContent = data.door_status ?? "-" ;
    };
}

// تابع گرفتن موجودی و نمایش در جدول
function getInventory() {
    fetch('/inventory')
        .then(response => response.json())
        .then(data => {
            let tableBody = document.querySelector('#inventory-table tbody');
            tableBody.innerHTML = ''; 
            data.items.forEach(item => {
                if (item.quantity <= 0) return;  // اینجا چک می‌کنیم که اگه صفر یا کمتر بود، نمایش نده
                
                let row = document.createElement('tr');
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
    ////////////////////////////////
    const limit = prompt("حداقل موجودی برای این کالا چقدر باشد؟", "1");
    ///////////////////////////////
    fetch('/updateProductName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            barcode: barcode,
            name: newName,
            min_limit: parseInt(limit) //////////////////
        })    
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
            if (data.alert) {
                alert("⚠️ موجودی این کالا در حال اتمام است!");
            }
            getInventory();  // بروزرسانی جدول
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
let currentDoorOpen = null;  // نگهدارنده وضعیت فعلی در

function fetchAndShowDoorModal() {
    fetch("/door_status")
        .then(res => res.json())
        .then(data => {
            currentDoorOpen = data.open;
            const modal = document.getElementById("door-modal");
            const text = document.getElementById("door-state-text");
            const btn = document.getElementById("door-action-btn");

            modal.style.display = "block";

            if (currentDoorOpen) {
                text.textContent = "The door is open";
                btn.textContent = "Closing the door";
            } else {
                text.textContent = "The door is close";
                btn.textContent = "Opening the door";
            }
        })
        .catch(err => {
            alert("خطا در دریافت وضعیت در");
            console.error(err);
        });
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

// تابع باز و بسته کردن منوی کناری با کلیک روی آیکن همبرگری
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

// تابع باز کردن پنجره وای‌فای (modal)
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

window.addEventListener('DOMContentLoaded', () => {
    getInventory();  // Fetch temperature & inventory once
    initSocket();     // Start WebSocket
});
