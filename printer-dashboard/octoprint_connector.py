"""
موصل Snapmaker عبر OctoPrint REST API.
يقرأ الحالة ويرسل ملفات G-code للطباعة.
"""


class OctoPrintConnector:
    def __init__(self, cfg):
        self.cfg = cfg
        self.base = f"http://{cfg['ip']}:{cfg.get('port', 5000)}/api"
        self.headers = {
            "X-Api-Key": cfg["api_key"],
            "Content-Type": "application/json",
        }

    def connect(self):
        try:
            import requests
        except ImportError:
            return False, "مكتبة requests غير مثبتة. نفذ: pip install requests"
        try:
            r = requests.get(f"{self.base}/version", headers=self.headers, timeout=5)
            if r.status_code == 200:
                return True, "متصل"
            return False, f"رمز الخطأ: {r.status_code}"
        except Exception as e:
            return False, f"فشل الاتصال: {e}"

    def get_status(self):
        import requests
        try:
            r = requests.get(f"{self.base}/job", headers=self.headers, timeout=5)
            if r.status_code != 200:
                return {"online": False, "status": f"رمز: {r.status_code}"}
            job = r.json()
            state = job.get("state", "")
            progress = job.get("progress", {}).get("completion", 0) or 0
            return {
                "online": True,
                "status": state,
                "progress": round(progress * 100, 1),
                "task_name": job.get("job", {}).get("file", {}).get("name", ""),
            }
        except Exception as e:
            return {"online": False, "status": f"خطأ: {e}"}

    def start_print(self, gcode_path):
        import requests
        # أولاً ارفع الملف ثم ابدأ الطباعة
        try:
            with open(gcode_path, "rb") as f:
                files = {"file": (gcode_path.split("/")[-1], f)}
                r = requests.post(
                    f"{self.base}/files/local",
                    headers={"X-Api-Key": self.cfg["api_key"]},
                    files=files,
                    timeout=30,
                )
            if r.status_code not in (200, 201):
                return False, f"فشل الرفع: {r.status_code}"
            name = r.json().get("files", {}).get("local", {}).get("name")
            if not name:
                return False, "ما تم استلام اسم الملف"
            r2 = requests.post(
                f"{self.base}/files/local/{name}",
                headers=self.headers,
                json={"command": "select", "print": True},
                timeout=10,
            )
            if r2.status_code == 200:
                return True, "تم إرسال أمر الطباعة"
            return False, f"فشل البدء: {r2.status_code}"
        except Exception as e:
            return False, f"فشل: {e}"

    def disconnect(self):
        pass
