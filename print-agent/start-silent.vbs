Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")
strDir = oFS.GetParentFolderName(WScript.ScriptFullName)
oShell.CurrentDirectory = strDir
oShell.Environment("Process")("PRINTER_IP") = "192.168.1.38"
oShell.Environment("Process")("PRINTER_PORT") = "9100"
oShell.Run "node server.js", 0, False
