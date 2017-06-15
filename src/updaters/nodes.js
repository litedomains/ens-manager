import { db, update} from 'redaxe'
import { fromJS } from 'immutable'
import { getSubdomains, getRootDomain, getOwner, getResolver, getAddr } from '../api/registry'
import { addNotification } from './notifications'

//web3

export const updatePublicResolverReducer = (db, address) =>
  db.set('publicResolver', address)

export function updatePublicResolver(address){
  update(updatePublicResolverReducer(db, address))
}

export const updateReadOnlyReducer = (db, value) =>
  db.set('readOnly', value)

export function updateReadOnly(value){
  update(updateReadOnlyReducer(db, value))
}

export function updateAddress(value) {
  update(
    db.set('rootName', value)
  )
  getOwner(value).then(owner =>
    update(db.set('rootAddress', owner))
  )
}

export function updateForm(formName, data) {
  update(
    db.setIn(['updateForm', formName], data)
  )
}

export function updateNode(name, prop, data) {
  const domainArray = name.split('.')
  let indexOfNode,
      updatePath = ['nodes', 0]

  if(domainArray.length > 2) {
    let domainArraySliced = domainArray.slice(0, domainArray.length - 2)
    updatePath = resolveUpdatePath(domainArraySliced, updatePath, db)
  }

  updatePath = [...updatePath, prop]

  update(
    db.setIn(updatePath, data)
  )
}

export function setNodeDetails(name, address) {
  const fetchSubdomains = name =>
    getSubdomains(name).then(subdomains => {
      appendSubDomains(subdomains, name)
      subdomains.forEach(subdomain =>
        fetchSubdomains(subdomain.name)
      )
    })

  addNotification('Node details set')

  getRootDomain(name).then(rootDomain => {
    update(
      db.set('nodes', rootDomain)
    )
    return name
  }).then(fetchSubdomains)

  getResolver(name).then(data =>
    update(
      db.set('resolver', data)
    )
  )

  getAddr(name).then(data =>{
    console.log(name, data)
    update(
      db.set('addr', data)
    )
  })

}

export function selectNode(data) {
  update(
    db.set('selectedNode', data)
  )
}

export function appendSubDomain(subDomain, domain, owner){
  const domainArray = domain.split('.')
  let indexOfNode,
      updatePath = ['nodes', 0, 'nodes']

  if(domainArray.length > 2) {
    let domainArraySliced = domainArray.slice(0, domainArray.length - 2)
    updatePath = resolveUpdatePath(domainArraySliced, updatePath, db)
  }

  update(
    db.updateIn(updatePath, nodes => nodes.push(fromJS({
      owner,
      label: subDomain,
      node: domain,
      name: subDomain + '.' + domain,
      nodes: []
    })))
  )

  addNotification(subDomain + '.' + domain +  'subdomain found')
}

export function appendSubDomains(subDomains, rootDomain) {
  const domainArray = rootDomain.split('.')
  let updatePath = ['nodes', 0, 'nodes']

  if(domainArray.length > 2) {
    let domainArraySliced = domainArray.slice(0, domainArray.length - 2)
    updatePath = resolveUpdatePath(domainArraySliced, updatePath, db)
  }

  subDomains.forEach(domain => {
    update(
      db.updateIn(updatePath, nodes => nodes.push(fromJS(domain)))
    )
  })

  let plural = subDomains.length === 1 ? '' : 's'

  addNotification(`${subDomains.length} subdomain${plural} found for ${rootDomain}`)
}

export function removeSubDomain(subDomain, rootDomain) {
  const domainArray = rootDomain.split('.')
  let indexOfNode,
      updatePath = ['nodes', 0, 'nodes']

  if(domainArray.length > 2) {
    let domainArraySliced = domainArray.slice(0, domainArray.length - 2)
    updatePath = resolveUpdatePath(domainArraySliced, updatePath, db)
  }

  indexOfNode = db.getIn(updatePath).findIndex(node => node.get('name') === subDomain + '.' + rootDomain)
  update(
    db.updateIn(updatePath, nodes => nodes.delete(indexOfNode))
  )
}

export function resolveUpdatePath(domainArray, path, db) {
  if(domainArray.length === 0 ){
    return path
  }

  let domainArrayPopped = domainArray.slice(0, domainArray.length - 1)
  let currentLabel = domainArray[domainArray.length - 1]

  function findIndex(path, db, label) {
    return db.getIn(path).findIndex(node =>
      node.get('label') === label
    );
  }

  let updatedPath;
  if(typeof path[path.length - 1] === 'string') {
    let index = findIndex(path, db, currentLabel)
    updatedPath = [...path, index, 'nodes']
  } else {
    updatedPath = [...path, 'nodes']
    let index = findIndex(updatedPath, db, currentLabel)
    updatedPath = [...updatedPath, index]
  }

  return resolveUpdatePath(domainArrayPopped, updatedPath, db)
}

export function getNodeInfoSelector(name, prop) {
  const domainArray = name.split('.')
  let indexOfNode,
      updatePath = ['nodes', 0]

  if(domainArray.length > 2) {
    let domainArraySliced = domainArray.slice(0, domainArray.length - 2)
    updatePath = resolveUpdatePath(domainArraySliced, updatePath, db)
  }

  updatePath = [...updatePath, prop]
  return db.getIn(updatePath)
}
