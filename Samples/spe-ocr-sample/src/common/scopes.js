"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEMBEDDED_CONTAINER_MANAGE = exports.SPEMBEDDED_FILESTORAGECONTAINER_SELECTED = exports.SPREPOSERVICES_FILESTORAGECONTAINER_SELECTED = exports.SPREPOSERVICES_CONTAINER_MANAGE = exports.GRAPH_OPENID_CONNECT_BASIC = exports.GRAPH_SITES_READ_ALL = exports.GRAPH_FILES_READ_WRITE_ALL = exports.GRAPH_USER_READ_ALL = exports.GRAPH_USER_READ = void 0;
// microsoft graph scopes
exports.GRAPH_USER_READ = 'User.Read';
exports.GRAPH_USER_READ_ALL = 'User.Read.All';
exports.GRAPH_FILES_READ_WRITE_ALL = 'Files.ReadWrite.All';
exports.GRAPH_SITES_READ_ALL = 'Sites.Read.All';
exports.GRAPH_OPENID_CONNECT_BASIC = ["openid", "profile", "offline_access"];
// SharePoint Embedded scopes
exports.SPREPOSERVICES_CONTAINER_MANAGE = 'Container.Manage';
exports.SPREPOSERVICES_FILESTORAGECONTAINER_SELECTED = 'FileStorageContainer.Selected';
exports.SPEMBEDDED_FILESTORAGECONTAINER_SELECTED = 'FileStorageContainer.Selected';
exports.SPEMBEDDED_CONTAINER_MANAGE = 'Container.Manage';
