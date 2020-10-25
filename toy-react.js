class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._range = null;
    }
    get vdom(){
        return this.render().vdom;
    }

    setAttribute(name,value){
        this.props[name] = value;
    }
    appendChild(child){
        this.children.push(child);
    }

    NodeToDom(range){
        // 更新DOM需要对更新位置有要求，所以需要range变量。
        // 要实现更新DOM操作就需要把创建节点写成一个方法，方便重新渲染时调用
        // 不再是取一个节点，而是渲染进range里面
        this._range = range;
        this._vdom = this.vdom;
        this._vdom.NodeToDom(range)
    }

    update(){
        let isSameNode = (oldNode,newNode)=>{
            // 查看节点是否相同：普通节点类型不同，属性不同就认为不同。文本节点还需要检查内容是否相同。内容和属性可通过打patch来检查，以后实现
            if (oldNode.type !== newNode.type)
                return false;
            for (let name in newNode.props) {
                if (oldNode.props[name] !== newNode.props[name])
                    return false
            }
            if (oldNode.props.length > newNode.props.length)
                return false
            if (newNode.type === '#text'){
                if (newNode.content !== oldNode.content)
                    return false
            }
            return true
        }

        let update = (oldNode,newNode) =>{
            // 最简单的diff算法 循环递归遍历所有子节点比较
            if (!isSameNode(oldNode,newNode)){
                newNode.NodeToDom(oldNode._range);
                return
            }
            newNode._range = oldNode._range;
            let newChildren = newNode.vchildren;
            let oldChildren = oldNode.vchildren;

            if (!oldChildren ||!oldChildren.length){
                return;
            }
            let tailRange = oldChildren[oldChildren.length-1]._range;

            for (let i=0;i<newChildren.length;i++){
                let newChild = newChildren[i];
                let oldChild = oldChildren[i];
                if (i<oldChildren.length){
                    update(oldChild,newChild);
                }else {
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer,tailRange.endOffset)
                    range.setEnd(tailRange.endContainer,tailRange.endOffset);
                    newChild.NodeToDom(range);
                    tailRange = range;
                }
            }
        }
        let vdom = this.vdom;
        update(this._vdom,vdom);
        this._vdom = vdom
    }

    setState(newState){
        if (this.state === null || typeof this.state !=='object'){
            this.state = newState;
            this.update();
            return
        }

        let merge = (oldState,newState) =>{
            for (let p in newState){
                if (oldState[p] ===null || typeof oldState[p] !=='object'){
                    oldState[p] = newState[p]
                }else {
                    merge(oldState[p],newState[p])
                }
            }
        }
        merge(this.state,newState)
        this.update()
    }
}


class elementWrapper extends Component{
    constructor(type) {
        super(type)
        this.type = type;
    }

    get vdom (){
        this.vchildren=this.children.map(child=>child.vdom)
        return this
    }

    NodeToDom(range){
        this._range = range
        let node = document.createElement(this.type);

        for (let name in this.props) {
            let value = this.props[name];
            if (name.match(/^on([\S\s]+)$/)){
                node.addEventListener(RegExp.$1.replace(/^[\s\S]/,c => c.toLocaleLowerCase()),value)
            }else {
                if (name === 'className'){
                    node.setAttribute('class',value)
                }else node.setAttribute(name,value)
            }
        }

        if (!this.vchildren)
            this.vchildren=this.children.map(child=>child.vdom)

        for (let child of this.vchildren) {
            let childrange = document.createRange();
            childrange.setStart(node,node.childNodes.length);
            childrange.setEnd(node,node.childNodes.length);
            child.NodeToDom(childrange)
        }
        replaceContent(range,node)
    }

}

class textWrapper extends Component{
    constructor(content) {
        super(content);
        this.content = content;
        this.type = '#text'
    }
    NodeToDom(range){
        this._range = range;
        let node =  document.createTextNode(this.content);
        replaceContent(range,node);
    }
    get vdom(){
        return this;
    }
}

function replaceContent(range,node) {
    //range中有个小bug，如果在旁边还有一个range的情况下，把自己range内容清空，就会被旁边的吞进去，所以我们需要在插入时保证range不为空
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();
    range.setStartBefore(node);
    range.setEndAfter(node);
}

function createElement(type,attrObj,...children){
    let tag
    if (typeof type === 'string'){
        // 原生的DOM标签会被转成字符串传入
        tag = new elementWrapper(type);     // 由于有了自定义组件，我们没有办法将它转变成一个真正的DOM对象，所以要对setAttribute和appendChild进行封装
    }else {
        // 自定义组件会默认是一个对象
        tag = new type;
    }

    for (let attrObjKey in attrObj) {
        tag.setAttribute(attrObjKey,attrObj[attrObjKey])
    }

    let inserChildren = (children) =>{
        for (let child of children) {
            if (typeof child === 'string'){
                // 如果是文本内容
                child = new textWrapper(child)
            }
            if (child === null){
                continue
            }
            if (typeof child === 'object' && child instanceof Array){
                // 组件render函数中调用{this.children}时会传入数组进children数组，所以需要递归遍历
                inserChildren(child)
            }else tag.appendChild(child);
        }
    }
    inserChildren(children);

    return tag;
}

function h(component,parentElement) {
    let range = document.createRange();
    range.setStart(parentElement,0);
    range.setEnd(parentElement,parentElement.childNodes.length);  //因为可能存在文本节点和注释节点，所以只能用childNodes
    range.deleteContents();
    component.NodeToDom(range)

}
export {createElement,Component,h}