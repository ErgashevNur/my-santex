Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")
strDir = oFS.GetParentFolderName(WScript.ScriptFullName)
oShell.CurrentDirectory = strDir

' ================================================================
' SOZLAMALAR:
'
' USB printer uchun: PRINTER_IP ni bo'sh qoldiring
'   oShell.Environment("Process")("PRINTER_IP") = ""
'   oShell.Environment("Process")("PRINTER_NAME") = "XP-80T"
'
' Tarmoq printer uchun: IP manzilni kiriting
'   oShell.Environment("Process")("PRINTER_IP") = "192.168.1.38"
' ================================================================

' USB ulangan printer uchun (PRINTER_NAME ni o'zgartiring):
oShell.Environment("Process")("PRINTER_IP") = ""
oShell.Environment("Process")("PRINTER_PORT") = "9100"
oShell.Environment("Process")("PRINTER_NAME") = "XP-80T"

' Tarmoq printer uchun yuqoridagi 3 qatorni o'chirib, quyidagini yoqing:
' oShell.Environment("Process")("PRINTER_IP") = "192.168.1.38"
' oShell.Environment("Process")("PRINTER_PORT") = "9100"

oShell.Run "node server.js", 0, False
