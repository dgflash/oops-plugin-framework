/** 行为树节点的 JSON 序列化格式，仅 3 个字段，结构精简 */
export interface BTNodeJson {
    /** 节点类型名，对应 registerFactory 注册的 key */
    type: string;
    /** 可选唯一标识，用于可视化高亮/定位 */
    id?: string;
    /** 子节点列表；叶子节点无此字段，Decorator 固定长度为 1 */
    children?: BTNodeJson[];
}
