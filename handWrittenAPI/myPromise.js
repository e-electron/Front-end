const PENDING = 'pending'
const FUFILLED = 'fufilled'
const REJECTED = 'rejected'

//---------- 封装一个异步函数 执行任务-------------
function runAsynctask(callback) {
  // 将类内部的回调函数转为异步的函数
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback)
  } else if (typeof MutationObserver === 'function') {
    const obs = new MutationObserver(callback)
    const divNode = document.createElement('div')
    obs.observe(divNode, { childList: true })
    divNode.innerHTML = 'xiugaile'
  } else {
    setTimeout(callback, 0)
  }
}

// ---------封装函数一个在类内频繁用到的函数-----------------
// function resolvePromise(x, p2, resolve, reject) {
//   // 处理重复的引用 回调函数的返回值是否是返回的自身promise
//   // 抛出错误 typeError
//   if (x === p2) {
//     // 如果返回了自身则抛出循环调用的错误
//     throw new TypeError('Channing cycle detected for promise #<Promise>')
//   }
//   // 如果在回调函数返回的是一个promise
//   if (x instanceof myPromise) {
//     x.then(res => resolve(res), err => reject(err))
//   } else {
//     resolve(x)
//   }
// }

// 符合Promise\A规范(考虑了各种边界情况)
// 符合Promise\A规范(考虑了各种边界情况)
function resolvePromise(x, p2, resolve, reject) {
  // 2.3.3.1 如果p2和x引用同一个对象,通过TypeError作为原因来拒绝pormise
  if (x === p2) {
    throw new TypeError('Chaining cycle detected for promise');
  }
  /**
   * 2.3.3.2 如果x是一个promise,采用他的状态
   *  2.3.3.3.1 如果x是pengding状态,promise必须保持等待状态,直到x被fulfilled或rejected
   *  2.3.3.3.2 如果x是fulfilled状态,用相同的原因解决promise
   *  2.3.3.3.3 如果x是rejected状态,用相同的原因拒绝promise
   * */
  if (x instanceof myPromise) {
    x.then(y => {
      resolvePromise(y, p2, resolve, reject)
    }, reject);
  }
  // 2.3.3 如果x是一个对象或者函数
  else if (x !== null && ((typeof x === 'object' || (typeof x === 'function')))) {
    // 2.3.3.1 让then成为x.then
    try {
      var then = x.then;
    } catch (e) {
      // 2.3.3.2 如果检索属性x.then抛出了异常e，用e作为原因拒绝promise
      return reject(e);
    }

    /**
     * 2.3.3.3  如果then是一个函数，通过call调用他,并且将x作为他的this(参数1)
     * 调用then时传入2个回调函数:
     *    第一个参数叫做resolvePromise(对应到的参数2)
     *    第二个参数叫做rejectPromise(对应到参数3)
     * */

    if (typeof then === 'function') {
      // 2.3.3.3.3 如果 resolvePromise 和 rejectPromise 均被调用，或者同一参数被调用了多次，只采用第一次调用,后续的调用会被忽略(观察called后续的赋值+判断)
      let called = false;
      try {
        then.call(
          x,
          // 2.3.3.3.1 如果 resolvePromise 以 成功原因 y 为参数被调用，继续执行 resolvePromise
          y => {
            if (called) return;
            called = true;
            resolvePromise(y, p2, resolve, reject);
          },
          // 2.3.3.3.2 如果 rejectPromise 以拒绝原因 r 为参数被调用，用 r 拒绝 promise
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        )
      }
      // 2.3.3.3.4 如果调用then抛出异常
      catch (e) {
        // 2.3.3.3.4.1 如果resolvePromise或rejectPromise已经被调用，忽略它
        if (called) return;
        called = true;

        // 2.3.3.3.4.2 否则以 e 作为拒绝原因 拒绝promise
        reject(e);
      }
    } else {
      // 2.3.3.4 如果then不是函数，用 x 作为原因 兑现promise
      resolve(x);
    }
  } else {
    // 2.3.4 如果then不是对象或函数，用 x 作为原因 兑现promise
    return resolve(x);
  }
}


// 手写的promise类
class myPromise {
  state = PENDING//状态
  result = undefined//原因
  // 私有的属性存储多次调用时的回调函数
  #handlers = []//[{onFufilled,onRejected}]

  // 构造函数
  constructor(func) {
    // 状态不可逆
    const resolve = (result) => {
      if (this.state === PENDING) {
        this.state = FUFILLED
        this.result = result

        this.#handlers.forEach(({ onFufilled }) => {
          // console.log(onFufilled);
          // onFufilled()
          onFufilled(this.result)
        })
        // console.log('resolve执行',result);
      }
    }
    const reject = (result) => {
      if (this.state === PENDING) {
        this.state = REJECTED
        this.result = result
        this.#handlers.forEach(({ onRejected }) => {
          onRejected(this.result)
        })
        // console.log('reject执行',result);
      }
    }
    // 4. 执行回调函数
    try {
      func(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  // then方法
  then(onFufilled, onRejected) {
    // 如果传入的两个参数是函数的话不管 继续执行成功或失败的代码
    // 如果是其他的 onFufilled返回传入的值 则onRejected抛出这个东西
    onFufilled = typeof onFufilled === 'function' ? onFufilled : x => x
    onRejected = typeof onRejected === 'function' ? onRejected : x => { throw x }

    // 构造链式调用返回的promise
    const p2 = new myPromise((resolve, reject) => {
      if (this.state === FUFILLED) {
        runAsynctask(() => {
          // 处理异常
          try {
            // 获取回调函数成功的返回结果传递给第二个
            const x = onFufilled(this.result)
            // 调用封装的函数
            resolvePromise(x, p2, resolve, reject)
            /* // 处理重复的引用 回调函数的返回值是否是返回的自身promise
            // 抛出错误 typeError
            if(x===p2){
              // 如果返回了自身则抛出循环调用的错误
              throw new TypeError('Channing cycle detected for promise #<Promise>')
            }
            // 如果在回调函数返回的是一个promise
            if(x instanceof myPromise){
              x.then(res=>resolve(res),err=>reject(err))
            } else {
              resolve(x)
            } */
          }
          catch (error) {
            // 捕获抛出的异常
            // console.log(error);
            reject(error)
          }
        })
      }
      else if (this.state === REJECTED) {
        runAsynctask(() => {
          try {
            const x = onRejected(this.result)
            resolvePromise(x, p2, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      }
      else if (this.state === PENDING) {
        this.#handlers.push({
          onFufilled: () => {
            runAsynctask(() => {
              // 处理异常
              try {
                // 获取回调函数返回值
                const x = onFufilled(this.result)
                //  调用函数
                resolvePromise(x, p2, resolve, reject)
              } catch (error) {
                reject(error)
              }
            })
          },
          onRejected: () => {
            runAsynctask(() => {
              // 处理异常
              try {
                // 获取回调函数返回值
                const x = onRejected(this.result)
                //  调用函数
                resolvePromise(x, p2, resolve, reject)
              } catch (error) {
                reject(error)
              }
            })
          }
          // onFufilled,onRejected
        })
      }
    })
    // 返回链式调用的promise
    return p2
  }


  // 实例方法
  // 1.catch方法
  catch(onRejected) {
    // 内部调用then
    return this.then(undefined, onRejected)
  }

  // 2.finally方法 无论成功失败都需要执行的
  finally(onFinally) {
    return this.then(onFinally, onFinally)
  }

  // 静态方法
  // 1.resolve：传入promise直接返回 其他值转为fufilled状态的promise对象
  static resolve(value) {
    // 判断传入的值
    if (value instanceof myPromise) {
      // 如果传入的是promise 直接返回
      return value
    }
    // 如果传入的是其他值 转为promise 并设置状态为fufilled
    // return new myPromise((resolve,reject)第二个参数不会用到 可以不写
    return new myPromise((resolve) => {
      resolve(value)
    })
  }

  // 2.reject:返回一个已拒绝的对象
  static reject(value) {
    // return new myPromise((resolve,reject)=>{
    return new myPromise((undefined, reject) => {
      reject(value)
    })
  }

  // 3.race：管理多个异步任务 返回第一个被敲定的 
  // 等待第一个成功或第一个失败 返回第一个promise，不传数组报TypeError
  static race(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      promises.forEach(p => {
        myPromise.resolve(p).then(res => resolve(res), err => reject(err))
      })
    })
  }

  // 4.all：输入的可迭代对象都兑现 则返回一个兑现的promise对象（即使传入的是空迭代对象）
  // 有一个被拒绝 就返回带有这个原因的拒绝
  static all(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      // 如果是空数组执行短路运算
      promises.length === 0 && resolve(promises)
      const results = [] //记录结果
      let count = 0//记录被兑现的数量是否和数组长度相同
      promises.forEach((p, index) => {
        myPromise.resolve(p).then(res => {
          results[index] = res
          count++
          // 当所有都被兑现 则返回按传入顺序排序的被兑现数组
          count === promises.length && resolve(results)
        }, err => {
          // 处理第一个拒绝 只要到这里 就调用reject终止promise进程
          reject(err)
        })
      })
    })
  }

  // 5.allSttled：传入：可迭代对象（包括空对象），所有promise都敲定 
  // 返回一个兑现的promise（带有描述每个promise结果的兑现数组）
  static allSettled(promises) {
    return new myPromise((resolve, reject) => {
      // 数组判断
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      // 空数组直接敲定
      promises.length === 0 && resolve(promises)
      const results = []//记录结果
      let count = 0
      // 等待全部敲定
      promises.forEach((p, index) => {
        myPromise.resolve(p).then(res => {
          // 处理兑现
          results[index] = { status: FUFILLED, value: res }
          count++
          count === promises.length && resolve(results)
        }, err => {
          results[index] = { status: REJECTED, reason: err }
          count++
          count === promises.length && resolve(results)
        })
      })
    })
  }

  // 6.any:返回第一个被兑现的promise和值
  // 所有都被拒绝时（包括空对象） 返回包含拒绝原因数组的拒绝
  static any(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      promises.length === 0 && reject(new AggregateError(promises, 'All promises were rejected'))
      const errors = []
      let count = 0
      promises.forEach((p, index) => {
        myPromise.resolve(p).then(res => {
          //第一个兑现
          resolve(res)
        }, err => {
          errors[index] = err
          count++
          // 所有被拒绝
          count === promises.length && reject(new AggregateError(errors, 'All promises were rejected'))
        })
      })
    })
  }

}


// 测试规范代码
module.exports = {
  deferred() {
    const res = {}
    res.promise = new myPromise((resolve, reject) => {
      res.resolve = resolve
      res.reject = reject
    })
    return res
  }
}