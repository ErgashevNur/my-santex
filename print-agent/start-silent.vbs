Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")
strDir = oFS.GetParentFolderName(WScript.ScriptFullName)
oShell.CurrentDirectory = strDir
oShell.Run "node server.js", 0, False
