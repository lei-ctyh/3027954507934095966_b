import router from './router'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isHttp } from '@/utils/validate'
import { isRelogin } from '@/utils/request'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'
import {useBasicStore} from '@/store/modules/basic';
import auth from '@/plugins/auth'

NProgress.configure({ showSpinner: false });

const whiteList = ['/login', '/register'];

function isExternalPath(path) {
  return typeof path === 'string' && isHttp(path)
}

function joinPath(parentPath, childPath) {
  if (!childPath) return parentPath || '/'
  if (childPath.startsWith('/')) return childPath
  const base = parentPath && parentPath !== '/' ? parentPath : ''
  return `${base}/${childPath}`.replace(/\/+/g, '/')
}

function getFirstLeafPath(routes, parentPath = '') {
  if (!Array.isArray(routes)) return ''
  for (const route of routes) {
    if (!route || isExternalPath(route.path)) continue

    const fullPath = joinPath(parentPath, route.path)
    const children = route.children

    if (Array.isArray(children) && children.length) {
      const childPath = getFirstLeafPath(children, fullPath)
      if (childPath) return childPath
    } else if (fullPath && fullPath !== '/') {
      return fullPath
    }
  }
  return ''
}

function getFirstAccessiblePath(fallbackRoutes) {
  const permissionStore = usePermissionStore()
  const candidates = (Array.isArray(fallbackRoutes) && fallbackRoutes.length)
    ? fallbackRoutes
    : (permissionStore.addRoutes || [])
  return getFirstLeafPath(candidates) || '/description'
}

router.beforeEach((to, from, next) => {
  NProgress.start()
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title)
    /* has token*/
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else {
      if (useUserStore().roles.length === 0) {
        isRelogin.show = true
        // 判断当前用户是否已拉取完user_info信息
        useUserStore().getInfo().then(async () => {
          isRelogin.show = false
          await initData()
          usePermissionStore().generateRoutes().then(accessRoutes => {
            // 根据roles权限生成可访问的路由表
            accessRoutes.forEach(route => {
              if (!isHttp(route.path)) {
                router.addRoute(route) // 动态添加可访问路由表
              }
            })
            if (to.path === '/') {
              next({ path: getFirstAccessiblePath(accessRoutes), replace: true })
            } else {
              next({ ...to, replace: true }) // hack方法 确保addRoutes已完成
            }
          })
        }).catch(err => {
          useUserStore().logOut().then(() => {
            ElMessage.error(err)
            next({ path: '/' })
          })
        })
      } else {
        if (to.path === '/') {
          next({ path: getFirstAccessiblePath(), replace: true })
        } else {
          next()
        }
      }
    }
  } else {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
      NProgress.done()
    }
  }
})

async function initData() {
  try {
    const basicStore = useBasicStore()
    const tasks = []

    if (auth.hasPermi('basic:warehouse:list')) tasks.push(basicStore.getWarehouseList())
    if (auth.hasPermi('basic:merchant:list')) tasks.push(basicStore.getMerchantList())
    if (auth.hasPermi('basic:goods:list')) {
      tasks.push(basicStore.getCategoryList())
      tasks.push(basicStore.getCategoryTreeList())
    }
    if (auth.hasPermi('basic:brand:list')) tasks.push(basicStore.getBrandList())
    if (auth.hasPermi('basic:bankAccount:list')) tasks.push(basicStore.getBankAccountList())

    await Promise.allSettled(tasks.map(t => Promise.resolve(t)))
  } catch (error) {
    console.error("Error during initData:", error);
    // 可以在这里执行额外的错误处理逻辑，例如通知用户或记录日志
  }
}


router.afterEach(() => {
  NProgress.done()
})
