"""
إعدادات الطابعات - عدّل القيم حسب بيئتك
"""

PRINTERS = [
    {
        "id": "bambu_01",
        "name": "Bambu Lab",
        "type": "bambu",
        "ip": "192.168.1.50",        # IP حق الطابعة في LAN mode
        "access_code": "12345678",   # Access Code من إعدادات الطابعة
        "serial": "00M09A000000000", # Serial Number (اختياري لبعض المكتبات)
        "enabled": True,
    },
    {
        "id": "snap_01",
        "name": "Snapmaker",
        "type": "octoprint",
        "ip": "192.168.1.60",        # IP حق جهاز OctoPrint (الـ Pi)
        "port": 5000,
        "api_key": "ABCDEF0123456789",  # OctoPrint API Key
        "enabled": True,
    },
]

FLASK_HOST = "0.0.0.0"
FLASK_PORT = 8080
