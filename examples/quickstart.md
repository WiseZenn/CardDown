# 数值分析速查

## 二分法

在连续函数上反复对半收缩区间，直到区间长度小于容差。

> [!NOTE] 适用条件
> 函数在区间上连续，且两个端点异号。

==收敛速度是线性的==，每轮迭代误差减半。

## 误差与收敛阶

设迭代序列 $x_k$ 收敛到 $x^*$，若存在 $p \geq 1$ 使

$$\lim_{k \to \infty} \frac{|x_{k+1} - x^*|}{|x_k - x^*|^p} = C$$

则称该方法具有 $p$ 阶收敛。

| 方法 | 收敛阶 | 每轮误差 |
|---|---|---|
| 二分法 | 1 | 减半 |
| 牛顿法 | 2 | 平方 |
| 割线法 | 1.618 | 超线性 |

## 牛顿迭代

$$x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}$$

```python
def newton(f, df, x0, tol=1e-10, max_iter=50):
    x = x0
    for _ in range(max_iter):
        step = f(x) / df(x)
        x -= step
        if abs(step) < tol:
            break
    return x
```
