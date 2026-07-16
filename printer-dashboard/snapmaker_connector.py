"""
موصل Snapmaker U1 عبر LAN mode.
بما إن U1 يدعم LAN لكن البروتوكول غير موثق بالكامل،
هذا الموصل يكتشف المنافذ المتاحة ويرسل عبر أمر الشبكة.
يُستخدم Luban LAN protocol إن توفر، وإلا يبقى وضع "استقبال ملفات".
"""

import socket
import json


class SnapmakerU1Connector:
    def __init__(self, cfg):
        self.cfg = cfg
        self.ip = cfg["ip"]
        self.port = cfg.get("port", 8080)  # منفذ LAN المحتمل لـ U1
        self.api_key = cfg.get("api_key", "")
        self._sock = None

    def connect(self):
        # فحص بسيط لو المنفذ مفتوح
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(3)
            result = s.connect_ex((self.ip, self.port))
            s.close()
            if result == 0:
                return True, f"المنفذ {self.port} مفتوح - متصل"
            return False, f"المنفذ {self.port} مقفل - تحقق من IP/المنفذ"
        except Exception as e:
            return False, f"فشل الاتصال: {e}"

    def get_status(self):
        # وضع محدود: نرجع حالة الاتصال فقط
        # (التتبع الكامل يحتاج توثيق بروتوكول LAN من Snapmaker)
        ok, msg = self.connect()
        if not ok:
            return {"online": False, "status": msg}
        return {
            "online": True,
            "status": "متصل (LAN) - تتبع محدود",
            "note": "بروتوكول U1 LAN غير موثق بالكامل، التتبع المباشر محدود",
            "progress": None,
            "task_name": "",
        }

    def start_print(self, gcode_path):
        # محاولة إرسال عبر بروتوكول Luban LAN إن توفر منفذ HTTP
        try:
            import requests
        except ImportError:
            return False, "مكتبة requests غير مثبتة. نفذ: pip install requests"
        try:
            with open(gcode_path, "rb") as f:
                files = {"file": (gcode_path.split("/")[-1], f)}
                headers = {"X-Api-Key": self.api_key} if self.api_key else {}
                r = requests.post(
                    f"http://{self.ip}:{self.port}/api/print",
                    headers=headers,
                    files=files,
                    timeout=30,
                )
            if r.status_code in (200, 201, 202):
                return True, "تم إرسال أمر الطباعة لـ U1"
            # إن فشل المنفذ، نرجع توجيه للمستخدم
            return False, (
                f"المنفذ {self.port} ما يرد على أمر الطباعة. "
                "المرجح إن U1 يستقبل عبر تطبيق Luban فقط. "
                "ارفع الملف يدوياً عبر Luban، أو شارك معي نتيجة nmap لنكتشف المنفذ الصحيح."
            )
        except Exception as e:
            return False, f"فشل: {e}"

    def disconnect(self):
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
