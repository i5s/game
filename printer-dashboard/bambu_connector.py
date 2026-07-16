"""
موصل Bambu Lab عبر LAN mode باستخدام MQTT المحلي.
يقرأ حالة الطابعة (حرارة، تقدم، حالة) ويرسل أوامر الطباعة.
يعتمد على مكتبة pymbambu (pip install pymbambu).
"""


class BambuConnector:
    def __init__(self, cfg):
        self.cfg = cfg
        self.client = None
        self._state = {}

    def connect(self):
        try:
            from pymbambu import BambuClient
            from pymbambu.const import BambuClientConfig
        except ImportError:
            return False, "مكتبة pymbambu غير مثبتة. نفذ: pip install pymbambu"

        config = BambuClientConfig(
            host=self.cfg["ip"],
            access_code=self.cfg["access_code"],
            serial=self.cfg.get("serial", ""),
        )
        self.client = BambuClient(config)
        try:
            self.client.connect()
            return True, "متصل"
        except Exception as e:
            return False, f"فشل الاتصال: {e}"

    def get_status(self):
        if not self.client:
            return {"online": False, "status": "غير متصل"}
        try:
            info = self.client.get_device()
            return {
                "online": True,
                "status": getattr(info, "gcode_state", "unknown"),
                "bed_temp": getattr(info, "bed_temp", 0),
                "nozzle_temp": getattr(info, "nozzle_temp", 0),
                "progress": getattr(info, "mc_percent", 0),
                "task_name": getattr(info, "subtask_name", ""),
            }
        except Exception as e:
            return {"online": False, "status": f"خطأ: {e}"}

    def start_print(self, gcode_path):
        if not self.client:
            return False, "غير متصل"
        try:
            self.client.start_print_gcode_file(gcode_path)
            return True, "تم إرسال أمر الطباعة"
        except Exception as e:
            return False, f"فشل: {e}"

    def disconnect(self):
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
