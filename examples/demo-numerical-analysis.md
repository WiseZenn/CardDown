# 数值分析核心算法与应用

## 第一章  非线性方程求根

### 1.1  二分法

二分法是求连续函数 $f(x)$ 在区间 $[a, b]$ 上零点的一种简单而可靠的方法。

**基本思想**：若 $f(a) \cdot f(b) < 0$，则 $(a, b)$ 内至少有一个根。取中点 $x_0 = \frac{a+b}{2}$，检查 $f(x_0)$ 的符号，将有根区间缩小一半。

>[!info] 收敛条件
>函数 $f(x)$ 在 $[a, b]$ 上连续，且 $f(a) \cdot f(b) < 0$。

误差估计：经过 $n$ 次二分后，

$$|x_n - x^*| \leq \frac{b - a}{2^{n+1}}$$

要满足精度 $\varepsilon$，所需迭代次数：

$$n \geq \log_2\frac{b-a}{\varepsilon} - 1$$

> 二分法总是收敛的，但收敛速度较慢，是**线性收敛**。实际工程中常作为其他方法的"保险丝"。

**算法实现**如下：

```python
def bisection(f, a, b, tol=1e-6, max_iter=100):
    """
    二分法求 f(x) = 0 的根

    参数:
        f: 目标函数
        a, b: 初始区间 [a, b]
        tol: 容许误差
        max_iter: 最大迭代次数
    """
    if f(a) * f(b) >= 0:
        raise ValueError("f(a) 和 f(b) 必须异号")

    iterations = 0
    history = []

    for k in range(max_iter):
        c = (a + b) / 2.0
        fc = f(c)
        error = (b - a) / 2.0
        history.append((k, a, b, c, fc, error))

        if abs(fc) < tol or error < tol:
            return c, iterations, history

        if f(a) * fc < 0:
            b = c
        else:
            a = c

        iterations = k + 1

    return c, iterations, history
```

- [x] 理解二分法原理
- [x] 掌握误差估计公式
- [ ] 完成编程实现与测试
- [ ] 对比牛顿法的收敛速度

### 1.2  牛顿迭代法

牛顿法利用函数的 Taylor 展开构造迭代格式：

$$x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}$$

**几何意义**：过点 $(x_k, f(x_k))$ 作切线，切线与 $x$ 轴的交点即为 $x_{k+1}$。

#### 收敛性分析

设 $x^*$ 是 $f(x)=0$ 的单根，$f'(x^*) \neq 0$。牛顿法至少**平方收敛**：

$$\lim_{k \to \infty} \frac{|x_{k+1} - x^*|}{|x_k - x^*|^2} = \left|\frac{f''(x^*)}{2f'(x^*)}\right|$$

>[!warning] 注意事项
>1. 初始值 $x_0$ 必须充分靠近真根，否则可能**发散**
>2. $f'(x_k) \approx 0$ 时迭代公式失效
>3. 多重根情形下退化为线性收敛

==关键记忆点==：牛顿法是**局部收敛**的，而二分法是**全局收敛**的。

## 第二章  线性方程组求解

### 2.1  Gauss 消去法

考虑 $n$ 阶线性方程组 $Ax = b$：

$$
\begin{bmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{n1} & a_{n2} & \cdots & a_{nn}
\end{bmatrix}
\begin{bmatrix} x_1 \ x_2 \ \vdots \ x_n \end{bmatrix}
=
\begin{bmatrix} b_1 \ b_2 \ \vdots \ b_n \end{bmatrix}
$$

#### 消元过程

第 $k$ 步消元公式：

$$m_{ik} = \frac{a_{ik}^{(k)}}{a_{kk}^{(k)}}, \quad i = k+1, \ldots, n$$

$$a_{ij}^{(k+1)} = a_{ij}^{(k)} - m_{ik} \cdot a_{kj}^{(k)}$$

$$b_i^{(k+1)} = b_i^{(k)} - m_{ik} \cdot b_k^{(k)}$$

#### 回代过程

$$x_n = \frac{b_n^{(n)}}{a_{nn}^{(n)}}$$

$$x_i = \frac{1}{a_{ii}^{(i)}}\left(b_i^{(i)} - \sum_{j=i+1}^{n} a_{ij}^{(i)} x_j\right), \quad i = n-1, \ldots, 1$$

### 2.2  LU 分解

将矩阵 $A$ 分解为下三角矩阵 $L$ 与上三角矩阵 $U$ 的乘积：

$$A = LU$$

其中：

$$L = \begin{pmatrix}
1 & 0 & \cdots & 0 \\
l_{21} & 1 & \cdots & 0 \\
\vdots & \vdots & \ddots & \vdots \\
l_{n1} & l_{n2} & \cdots & 1
\end{pmatrix}, \quad
U = \begin{pmatrix}
u_{11} & u_{12} & \cdots & u_{1n} \\
0 & u_{22} & \cdots & u_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
0 & 0 & \cdots & u_{nn}
\end{pmatrix}$$



>[!tip] 计算优势
>一旦完成 LU 分解，对不同的右端项 $b$，只需解两个三角方程组：
>$$Ly = b, \quad Ux = y$$
>总计算量为 $O(n^2)$，远小于重新消元的 $O(n^3)$。

**Doolittle 分解**的紧凑格式：

| 步骤 | 计算内容 | 计算量 |
|------|---------|--------|
| U 的第 $k$ 行 | $u_{kj} = a_{kj} - \sum_{m=1}^{k-1} l_{km}u_{mj}$ | $O(n^2)$ |
| L 的第 $k$ 列 | $l_{ik} = (a_{ik} - \sum_{m=1}^{k-1} l_{im}u_{mk}) / u_{kk}$ | $O(n^2)$ |
| 回代求解 | $Ly=b, Ux=y$ | $O(n^2)$ |

### 2.3  迭代法对比

| 方法 | 收敛条件 | 收敛速度 | 存储需求 | 适用场景 |
|------|---------|---------|---------|---------|
| Jacobi | $\rho(B_J) < 1$ | 线性 | $O(n^2)$ | 对角占优矩阵 |
| Gauss-Seidel | $\rho(B_{GS}) < 1$ | 超线性 | $O(n^2)$ | 对称正定矩阵 |
| SOR | $\omega \in (0,2)$ | 可优化 | $O(n^2)$ | Poisson 方程 |
| 共轭梯度 | SPD 矩阵 | 超线性 | $O(n)$ | 大型稀疏 SPD |

## 第三章  函数插值与逼近

### 3.1  Lagrange 插值

给定 $n+1$ 个互异节点 $(x_i, y_i)_{i=0}^{n}$，Lagrange 插值多项式为：

$$L_n(x) = \sum_{k=0}^{n} y_k \cdot \ell_k(x)$$

其中 Lagrange 基函数：

$$\ell_k(x) = \prod_{\substack{j=0 \ j \neq k}}^{n} \frac{x - x_j}{x_k - x_j}$$

>[!danger] Runge 现象
>等距节点的高次 Lagrange 插值会在区间端点附近产生剧烈震荡。
>使用 ==Chebyshev 节点== 可以有效抑制 Runge 现象。

```matlab
% Lagrange 插值 MATLAB 实现
function y = lagrange_interp(x_nodes, y_nodes, x_eval)
    n = length(x_nodes);
    m = length(x_eval);
    y = zeros(1, m);

    for i = 1:m
        for k = 1:n
            % 计算基函数 l_k(x)
            Lk = 1;
            for j = 1:n
                if j ~= k
                    Lk = Lk * (x_eval(i) - x_nodes(j)) ...
                           / (x_nodes(k) - x_nodes(j));
                end
            end
            y(i) = y(i) + y_nodes(k) * Lk;
        end
    end
end
```

### 3.2  三次样条插值

三次样条 $S(x)$ 满足：

1. $S(x_i) = y_i, \quad i = 0,1,\ldots,n$
2. $S(x)$ 在每个子区间 $[x_{i-1}, x_i]$ 上是三次多项式
3. $S(x) \in C^2[a,b]$，即二阶导数连续

**边界条件**：

$$\begin{cases}
\text{自然边界：} & S''(x_0) = S''(x_n) = 0 \\
\text{ clamped:} & S'(x_0) = f'(x_0),\; S'(x_n) = f'(x_n)
\end{cases}$$

>[!note] 最优性质
>三次样条在所有满足插值条件的 $C^2$ 函数中，使得曲率平方积分
>$$\int_a^b [f''(x)]^2 \, dx$$
>最小。这意味着样条曲线在某种意义上是"最光滑"的插值曲线。

## 第四章  数值积分

### 4.1  Newton-Cotes 公式

将积分区间 $[a,b]$ $n$ 等分，用 Lagrange 插值多项式近似被积函数：

$$\int_a^b f(x)\,dx \approx \sum_{k=0}^{n} A_k f(x_k)$$

其中求积系数 $A_k = \int_a^b \ell_k(x)\,dx$。

#### 常用低阶公式

| $n$ | 名称 | 公式 | 误差阶 |
|-----|------|------|--------|
| 1 | 梯形公式 | $\frac{h}{2}[f(a) + f(b)]$ | $O(h^3)$ |
| 2 | Simpson 公式 | $\frac{h}{3}[f(a) + 4f(m) + f(b)]$ | $O(h^5)$ |
| 3 | Simpson 3/8 | $\frac{3h}{8}[f_0 + 3f_1 + 3f_2 + f_3]$ | $O(h^5)$ |
| 4 | Boole 公式 | $\frac{2h}{45}[7f_0 + 32f_1 + 12f_2 + 32f_3 + 7f_4]$ | $O(h^7)$ |

### 4.2  Gauss 求积公式

Gauss 型求积公式具有最高代数精度：

$$\int_{-1}^{1} f(x)\,dx \approx \sum_{k=1}^{n} w_k f(x_k)$$

其中 $x_k$ 是 Legendre 多项式 $P_n(x)$ 的零点。

Gauss-Legendre 节点与权重（$n=3$）：

```python
# 三点 Gauss-Legendre 求积
import math

nodes = [-math.sqrt(3/5), 0, math.sqrt(3/5)]
weights = [5/9, 8/9, 5/9]

def gauss_legendre_3(f, a, b):
    """三点 Gauss-Legendre 公式"""
    mid = (a + b) / 2
    half = (b - a) / 2
    result = 0
    for i in range(3):
        x = mid + half * nodes[i]
        result += weights[i] * f(x)
    return result * half
```

> [!IMPORTANT] 精度对比
> 3 点 Gauss 公式具有 $2 \times 3 - 1 = 5$ 次代数精度，等价于 6 个等距节点的 Newton-Cotes 公式。==用更少的点获得更高的精度==是 Gauss 求积的核心优势。

### 4.3  复合求积公式的收敛性

考察复合梯形公式：

$$T_n = h\left[\frac{1}{2}f(a) + \sum_{i=1}^{n-1} f(a+ih) + \frac{1}{2}f(b)\right]$$

其误差为 $-\frac{b-a}{12}h^2 f''(\xi)$，其中 $h = \frac{b-a}{n}$。

整个文档检验了以下特性：

- 6 级标题 (H1–H6，覆盖封面目录提取)
- 数学公式：行内 $f(x)$ 与行间矩阵/积分/求极限/分段函数
- GFM 表格（含 LaTeX 单元格）
- 代码块：Python / MATLAB，含长函数（测试跨页拆分）
- Obsidian Callout: info / warning / tip / danger / note / important
- `==高亮==` 语法
- 任务列表 (task list)
- Blockquote 引用
- 加粗/斜体
- 有序/无序列表
- 嵌套代码块样式
