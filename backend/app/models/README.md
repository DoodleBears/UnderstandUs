# Models 模块

数据模型模块定义了应用程序中使用的所有数据模型和模式。

## 文件结构

```
models/
└── room.py  # 房间相关的数据模型
```

## 功能说明

### room.py

定义了与房间管理相关的数据模型：

1. Room 模型

```python
class Room(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: datetime
    participants: List[str] = []
    status: RoomStatus = RoomStatus.ACTIVE
```

2. RoomCreate 模型（用于创建房间）

```python
class RoomCreate(BaseModel):
    name: str
    description: str | None = None
```

3. RoomStatus 枚举

```python
class RoomStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CLOSED = "closed"
```

## 数据验证

所有模型都基于 Pydantic，提供：

- 数据类型验证
- 自动类型转换
- 默认值处理
- 字段验证规则

使用示例：

```python
# 创建房间
room_data = {
    "name": "测试房间",
    "description": "这是一个测试房间"
}
room = RoomCreate(**room_data)

# 数据验证
try:
    Room(
        id="123",
        name="测试房间",
        created_at="2024-03-10T12:00:00",
        status="invalid"  # 将引发验证错误
    )
except ValidationError as e:
    print(f"验证错误: {e}")
```

## JSON 序列化

模型支持自动 JSON 序列化和反序列化：

```python
# 序列化为 JSON
room_json = room.model_dump_json()

# 从 JSON 反序列化
room = Room.model_validate_json(room_json)
```

## API 响应模型

模型也用作 FastAPI 的响应模型：

```python
@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    return await room_service.get_room(room_id)
```

## 字段说明

### Room 模型字段

| 字段名       | 类型       | 说明           | 必填 |
| ------------ | ---------- | -------------- | ---- |
| id           | str        | 房间唯一标识符 | 是   |
| name         | str        | 房间名称       | 是   |
| description  | str        | 房间描述       | 否   |
| created_at   | datetime   | 创建时间       | 是   |
| participants | List[str]  | 参与者列表     | 否   |
| status       | RoomStatus | 房间状态       | 否   |
