class Mvvm {
  constructor(opt) {
    this.opt = opt || {};
    this.data = opt.data;
    this.root = document.getElementById(opt.el);
    this.observe(opt.data);
    this.compile = new Compile(this.opt.template, this);
  }

  // 使data数据可监听
  observe(data) {
    if (!data || typeof data !== 'object') return;

    Object.keys(data).forEach((key) => {
      this.defineReactive(data, key, data[key]);
    });
  }

  defineReactive(obj, key, val) {
    // 为data的每个属性添加一个dep订阅器
    let dep = new Dep();
    Object.defineProperty(obj, key, {
      get() {
        // 依赖收集
        dep.depend();
        return val;
      },
      set(newVal) {
        if (newVal === val) return;
        val = newVal;
        dep.notify();
      }
    })
  }
}

// 模版处理类
class Compile {
  constructor(template, vm) {
    this._template = template;
    this._vm = vm;
    this.init();
  }

  init() {
    let fragment = this.template2Fragment(this._template);
    this.compileFragment(fragment);

    this._vm.root.appendChild(fragment);
  }

  template2Fragment(template) {
    if (!template) return;
    let temp_node = document.createElement('div');
    temp_node.innerHTML = template;
    let fragment = document.createDocumentFragment();
    fragment.appendChild(temp_node.firstElementChild);
    return fragment;
  }

  compileFragment(fragment) {
    let childNodes = fragment.childNodes;
    let reg = /\{\{(.*)\}\}/;
    [].slice.call(childNodes).forEach((node) => {
      if (!node.firstElementChild) {
        if (reg.test(node.textContent)) {
          let key = reg.exec(node.textContent)[1].trim();
          // 将解析出的一处数据绑定提取并构造为一个订阅者
          let value = this.bindWatcher(node, key, node.textContent);

          // node.textContent = node.textContent.replace(reg, value);
          this.nodeUpdater(node, value);
        }
      } else {
        this.compileFragment(node);
      }
    })
  }

  nodeUpdater(node, value) {
    node.textContent = value;
  }

  bindWatcher(node, key, nodeNativeVal) {
    return new Watcher(this._vm, key, nodeNativeVal, value => {
      this.nodeUpdater(node, value);
    }).getReactiveValue();
  }
}

// 依赖订阅器
class Dep {
  constructor() {
    this.subs = [];
  }

  addSub(sub) {
    this.subs.push(sub);
  }

  // 依赖收集
  depend() {
    if (Dep.target && this.subs.indexOf(Dep.target) === -1) {
      this.addSub(Dep.target);
    }
  }

  // 订阅通知
  notify() {
    this.subs.forEach((sub) => {
      sub.update();
    });
  }
}

Dep.target = null;

// 订阅者
class Watcher {
  constructor(vm, key, nodeNativeVal, cb) {
    this._vm = vm;
    this._key = key;
    this._nodeNativeVal = nodeNativeVal;
    // 初始化时去触发该data属性的getter方法，从而将自身添加进订阅器
    this.value = this.get();
    this._cb = cb;
  }

  get() {
    Dep.target = this; // 缓存此订阅者
    let value = this._vm.data[this._key];
    Dep.target = null; // 释放此订阅者
    return value;
  }

  getValue() {
    return this.value;
  }

  // 引入nodeNativeVal和此函数是为了避免更新node的数据时，将没有绑定的内容一并覆盖了（即避免node.textContent = newVal)
  getReactiveValue() {
    return this._nodeNativeVal.replace(/\{\{(.*)\}\}/, this.getValue());
  }

  update() {
    // 监控数据依赖更新情况（没有依赖的即视图没用到的数据不作更新）
    console.log('更新', this._key);
    
    let value = this._vm.data[this._key];
    if (value !== this.value) {
      this.value = value;
      this._cb(this.getReactiveValue());
    }
  }
}

let mvvm = new Mvvm({
  el: 'app',
  data: {
    name: 'yangzemin',
    age: 18
  },
  template: `
    <div>
      <p>name: {{name}}</p>
      <p>{{ name }}</p>
    </div>
  `
});

setTimeout(() => {
  mvvm.data.name = 'YANGZEMIN';
  mvvm.data.age = 23;
}, 3000);