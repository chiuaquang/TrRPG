/*:
 * @plugindesc [V3.0 - Android] BI9 DỊCH CHEAT - Hack Item & Dịch Full Game
 * @author Bi9
 * @help
 * - Nút ⚙️ nằm bên trái màn hình.
 * - Mở rộng dịch thuật toàn diện: Hội thoại, Lựa chọn, Menu, Tên vật phẩm, Nhật ký nhiệm vụ.
 * - Bổ sung tính năng tự động quét và Hack Item/Vũ khí/Trang bị có trong game.
 */

(function() {
    // ==========================================
    // 1. BỘ MÁY DỊCH THUẬT & LƯU TRỮ (CACHE)
    // ==========================================
    const TARGET_LANG = 'vi';
    let translationCache = {};

    try {
        const savedCache = localStorage.getItem('mv_translation_cache');
        if (savedCache) translationCache = JSON.parse(savedCache);
    } catch (e) { console.error("Lỗi đọc cache:", e); }

    function saveCache() {
        try {
            localStorage.setItem('mv_translation_cache', JSON.stringify(translationCache));
        } catch(e) {}
    }

    // Hàm gọi Google Dịch dùng chung
    function translateTextSync(text) {
        if (!text || typeof text !== 'string' || text.trim() === '' || !isNaN(text)) return text;
        if (translationCache[text]) return translationCache[text];

        try {
            const xhr = new XMLHttpRequest();
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(text)}`;
            xhr.open('GET', url, false); 
            xhr.send();

            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                let translatedText = '';
                response[0].forEach(t => { if (t[0]) translatedText += t[0]; });
                
                translationCache[text] = translatedText;
                saveCache();
                return translatedText;
            }
        } catch (e) { console.error("Lỗi dịch:", e); }
        
        return text;
    }

    // ==========================================
    // 2. ĐÁNH CHẶN (HOOKING) CÁC HÀM HIỂN THỊ CHỮ
    // ==========================================

    // [A] Dịch Hội thoại bình thường
    const _Game_Message_add = Game_Message.prototype.add;
    Game_Message.prototype.add = function(text) {
        _Game_Message_add.call(this, translateTextSync(text));
    };

    // [B] Dịch các Lựa chọn (Talk, Party Up, Nevermind...)
    const _Game_Message_setChoices = Game_Message.prototype.setChoices;
    Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
        let translatedChoices = [];
        for (let i = 0; i < choices.length; i++) {
            translatedChoices.push(translateTextSync(choices[i]));
        }
        _Game_Message_setChoices.call(this, translatedChoices, defaultType, cancelType);
    };

    // [C] Dịch các Menu Hệ thống (Status, Items, Save, Options...)
    const _Window_Command_addCommand = Window_Command.prototype.addCommand;
    Window_Command.prototype.addCommand = function(name, symbol, enabled, ext) {
        let translatedName = translateTextSync(name);
        _Window_Command_addCommand.call(this, translatedName, symbol, enabled, ext);
    };

    // [D] Dịch tên Vật phẩm, Vũ khí, Áo giáp (Water, Food...)
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function(item, x, y, width) {
        if (item && item.name) {
            item.name = translateTextSync(item.name);
        }
        _Window_Base_drawItemName.call(this, item, x, y, width);
    };

    // [E] Dịch Text tự do (Dùng cho giao diện Nhật ký nhiệm vụ, Menu Custom)
    const _Window_Base_drawText = Window_Base.prototype.drawText;
    Window_Base.prototype.drawText = function(text, x, y, maxWidth, align) {
        let translatedText = translateTextSync(text);
        _Window_Base_drawText.call(this, translatedText, x, y, maxWidth, align);
    };

    // [F] Dịch Text có mã điều khiển (Mô tả nhiệm vụ có màu sắc, icon...)
    const _Window_Base_drawTextEx = Window_Base.prototype.drawTextEx;
    Window_Base.prototype.drawTextEx = function(text, x, y) {
        let translatedText = translateTextSync(text);
        return _Window_Base_drawTextEx.call(this, translatedText, x, y);
    };


    // ==========================================
    // 3. TẠO GIAO DIỆN NỔI (BÊN TRÁI MÀN HÌNH)
    // ==========================================
    function createInGameUI() {
        if (document.getElementById('mv-debug-btn')) return;

        // 1. Nút Bánh Răng
        const btn = document.createElement('div');
        btn.id = 'mv-debug-btn';
        btn.innerHTML = '⚙️';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.left = '10px';
        btn.style.width = '45px';
        btn.style.height = '45px';
        btn.style.background = 'rgba(195, 7, 63, 0.7)';
        btn.style.color = '#fff';
        btn.style.borderRadius = '50%';
        btn.style.display = 'flex';
        btn.style.justifyContent = 'center';
        btn.style.alignItems = 'center';
        btn.style.fontSize = '22px';
        btn.style.zIndex = '10000';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 0 8px rgba(0,0,0,0.5)';

        // 2. Bảng Menu Hack
        const menu = document.createElement('div');
        menu.id = 'mv-debug-menu';
        menu.style.position = 'fixed';
        menu.style.top = '60px';
        menu.style.left = '10px';
        menu.style.width = '240px'; // Mở rộng width để hiển thị tên item cho rõ
        menu.style.background = 'rgba(25, 25, 25, 0.95)';
        menu.style.border = '2px solid #c3073f';
        menu.style.borderRadius = '8px';
        menu.style.padding = '10px';
        menu.style.display = 'none'; 
        menu.style.zIndex = '10000';
        menu.style.boxShadow = '0 0 12px rgba(0,0,0,0.6)';

        // Tiêu đề Menu mới
        const title = document.createElement('div');
        title.innerText = '⚙️ BI9 DỊCH CHEAT';
        title.style.color = '#c3073f';
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.fontSize = '14px';
        menu.appendChild(title);

        function addCheatButton(text, action) {
            const b = document.createElement('button');
            b.innerText = text;
            b.style.width = '100%';
            b.style.padding = '8px 5px';
            b.style.margin = '4px 0';
            b.style.background = '#4e4e50';
            b.style.color = '#fff';
            b.style.border = 'none';
            b.style.borderRadius = '4px';
            b.style.fontSize = '13px';
            b.style.cursor = 'pointer';
            b.onclick = function(e) {
                e.stopPropagation(); 
                action();
            };
            menu.appendChild(b);
            return b;
        }

        // --- CÁC NÚT HACK CƠ BẢN ---
        addCheatButton('💰 +9,999,999 Vàng', function() {
            if (window.$gameParty) {
                window.$gameParty.gainGold(9999999);
                alert("Đã thêm vàng thành công!");
            } else { alert("Hãy load vào chơi game trước!"); }
        });

        addCheatButton('❤️ Hồi Phục Toàn Đội', function() {
            if (window.$gameParty) {
                window.$gameParty.members().forEach(actor => actor.recoverAll());
                alert("Đã hồi máu & năng lượng!");
            } else { alert("Hãy load vào chơi game trước!"); }
        });

        let isSpeedUp = false;
        addCheatButton('⚡ Tăng Tốc Game (x2)', function() {
            if (window.SceneManager) {
                if (!isSpeedUp) {
                    const _originalUpdate = SceneManager.update;
                    SceneManager.update = function() {
                        _originalUpdate.call(this);
                        _originalUpdate.call(this);
                    };
                    isSpeedUp = true;
                    alert("Đã bật Tăng tốc x2!");
                } else {
                    alert("Tốc độ đã được kích hoạt từ trước.");
                }
            }
        });

        // --- KHU VỰC HACK ITEM ---
        const itemSection = document.createElement('div');
        itemSection.style.marginTop = '12px';
        itemSection.style.borderTop = '1px dashed #c3073f';
        itemSection.style.paddingTop = '10px';

        const itemLabel = document.createElement('div');
        itemLabel.innerText = '🎒 Hack Vật Phẩm / Trang bị:';
        itemLabel.style.color = '#ffcc00';
        itemLabel.style.fontSize = '12px';
        itemLabel.style.marginBottom = '6px';
        itemSection.appendChild(itemLabel);

        const itemSelect = document.createElement('select');
        itemSelect.style.width = '100%';
        itemSelect.style.marginBottom = '8px';
        itemSelect.style.background = '#333';
        itemSelect.style.color = '#fff';
        itemSelect.style.border = '1px solid #555';
        itemSelect.style.padding = '6px';
        itemSelect.style.borderRadius = '4px';
        itemSelect.style.fontSize = '12px';

        const itemFlex = document.createElement('div');
        itemFlex.style.display = 'flex';
        itemFlex.style.justifyContent = 'space-between';

        const itemQty = document.createElement('input');
        itemQty.type = 'number';
        itemQty.value = '99';
        itemQty.style.width = '45%';
        itemQty.style.background = '#333';
        itemQty.style.color = '#fff';
        itemQty.style.border = '1px solid #555';
        itemQty.style.padding = '6px';
        itemQty.style.borderRadius = '4px';
        itemQty.style.textAlign = 'center';

        const itemAddBtn = document.createElement('button');
        itemAddBtn.innerText = 'Thêm Ngay';
        itemAddBtn.style.width = '48%';
        itemAddBtn.style.background = '#c3073f';
        itemAddBtn.style.color = '#fff';
        itemAddBtn.style.border = 'none';
        itemAddBtn.style.borderRadius = '4px';
        itemAddBtn.style.cursor = 'pointer';
        itemAddBtn.style.fontWeight = 'bold';

        itemAddBtn.onclick = function(e) {
            e.stopPropagation();
            if (!window.$gameParty) {
                alert("Vui lòng load vào game trước khi Hack Item!");
                return;
            }
            const val = itemSelect.value;
            if (!val) {
                alert("Chưa chọn vật phẩm!");
                return;
            }
            
            const parts = val.split('_');
            const type = parts[0];
            const id = parseInt(parts[1]);
            const qty = parseInt(itemQty.value) || 1;

            let itemData = null;
            if (type === 'item') itemData = window.$dataItems[id];
            else if (type === 'weapon') itemData = window.$dataWeapons[id];
            else if (type === 'armor') itemData = window.$dataArmors[id];

            if (itemData) {
                window.$gameParty.gainItem(itemData, qty);
                alert(`Thành công! Đã thêm ${qty} x [${itemData.name}] vào túi đồ.`);
            }
        };

        itemFlex.appendChild(itemQty);
        itemFlex.appendChild(itemAddBtn);
        
        itemSection.appendChild(itemSelect);
        itemSection.appendChild(itemFlex);
        menu.appendChild(itemSection);

        // --- XỬ LÝ MỞ MENU VÀ LOAD DỮ LIỆU GAME ---
        btn.onclick = function(e) {
            e.stopPropagation();
            if (menu.style.display === 'none') {
                menu.style.display = 'block';
                
                // Tự động load danh sách Item nếu chưa load (Load khi mở menu để đảm bảo Game đã khởi tạo xong dữ liệu)
                if (itemSelect.children.length === 0 && window.$dataItems) {
                    let html = '';
                    if (window.$dataItems) {
                        html += '<optgroup label="📦 Vật Phẩm (Items)">';
                        window.$dataItems.forEach(i => { if(i && i.name) html += `<option value="item_${i.id}">${i.name}</option>` });
                        html += '</optgroup>';
                    }
                    if (window.$dataWeapons) {
                        html += '<optgroup label="⚔️ Vũ Khí (Weapons)">';
                        window.$dataWeapons.forEach(w => { if(w && w.name) html += `<option value="weapon_${w.id}">${w.name}</option>` });
                        html += '</optgroup>';
                    }
                    if (window.$dataArmors) {
                        html += '<optgroup label="🛡️ Trang Bị (Armors)">';
                        window.$dataArmors.forEach(a => { if(a && a.name) html += `<option value="armor_${a.id}">${a.name}</option>` });
                        html += '</optgroup>';
                    }
                    itemSelect.innerHTML = html;
                } else if (!window.$dataItems) {
                    itemSelect.innerHTML = '<option value="">(Hãy vào Game trước...)</option>';
                }
            } else {
                menu.style.display = 'none';
            }
        };

        document.body.appendChild(btn);
        document.body.appendChild(menu);
    }

    const _Scene_Base_start = Scene_Base.prototype.start;
    Scene_Base.prototype.start = function() {
        _Scene_Base_start.call(this);
        createInGameUI();
    };

})();
