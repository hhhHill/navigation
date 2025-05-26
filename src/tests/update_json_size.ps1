# 添加size属性到JSON文件中的所有节点
# update_json_size.ps1

# 读取JSON文件
$jsonFilePath = "map_data.json"
$jsonContent = Get-Content -Path $jsonFilePath -Raw | ConvertFrom-Json

# 为每个节点添加size属性（如果不存在的话）
foreach ($node in $jsonContent.nodes) {
    # 只有当节点没有size属性时才添加
    if (-not (Get-Member -InputObject $node -Name "size" -MemberType Properties)) {
        Add-Member -InputObject $node -MemberType NoteProperty -Name "size" -Value 1
    }
}

# 将修改后的内容写回文件
$jsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonFilePath

Write-Host "Successfully added size property to all nodes in $jsonFilePath." 