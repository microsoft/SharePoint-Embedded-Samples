import React, { useState, useEffect } from 'react';
import { Dialog, Stack, TextField, List, IconButton, PrimaryButton, DialogType, DialogFooter, DefaultButton, DetailsList, DetailsListLayoutMode, Icon, CommandBarButton, Text, CommandBar, Spinner } from '@fluentui/react';
import RaaS from '../services/raas';
const raas = new RaaS();

const Permissions = (props) => {

    const { closePermissionsViewHandler, currentContainer, onContainerChange } = props
    const [permissions, setPermissions] = useState([]);
    const [selectedPermission, setSelectedPermission] = useState({});
    const [loadingPermissions, setLoadingPermissions] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [userPrincipalName, setUserPrincipalName] = useState('');
    const [role, setRole] = useState('');

    const permissionsCommands = [
        {
            key: 'containerPermissions',
            onRender: () => <CommandBarButton><Text variant={'large'}>Permissions</Text></CommandBarButton>,
        },
        {
            key: 'addPermissions',
            text: 'Add Permissions',
            iconProps: { iconName: 'Add' },
            onClick: () => { setShowAddDialog(true) },
        },
        {
            key: 'closeButton',
            onRender: (item) => (
                <CommandBarButton
                    iconProps={{ iconName: "FileRequest" }}
                    onClick={() => closePermissionsViewHandler()}
                />
            )
        },
    ];

    const columns = [
        { key: 'id', name: 'Id', fieldName: 'id', minWidth: 50, maxWidth: 50 },
        { key: 'username', name: 'Username', fieldName: 'username', minWidth: 300, maxWidth: 300 },
        { key: 'roles', name: 'Role', fieldName: 'roles', minWidth: 200, maxWidth: 200 },
        {
            key: 'delete',
            name: '',
            fieldName: 'delete',
            minWidth: 30,
            maxWidth: 30,
            onRender: (item) => (
                <Icon iconName="Delete" onClick={() => {
                    setShowDeleteDialog(true);
                    setSelectedPermission(item);
                }} />
            ),
        },
    ];

    const items = [
        { key: 1, username: 'John Doe', role: 'Admin' },
        { key: 2, username: 'Jane Smith', role: 'User' },
        { key: 3, username: 'Bob Johnson', role: 'User' },
    ];

    const stackProps = {
        horizontalAlign: 'start',
        verticalAlign: 'start',
        styles: {
            root: {
                width: '100%',
            },
        },
    };

    useEffect(async () => {
        await loadPermissions();
    }, []);

    useEffect(async () => {
        await loadPermissions();
    }, [onContainerChange]);


    // useEffect(() => {
    //     closePermissionsViewHandler();
    //   }, [onContainerSelectedChanged]);

    const loadPermissions = async () => {
        setLoadingPermissions(true);
        let permissionItems = [];
        const perms = await raas.listContainerPermissions(currentContainer)
        console.log(perms)
        if (perms) {
            for (let item of perms.value) {
                let roles = item.roles;
                let user_principal = item.grantedToV2.user.userPrincipalName;
                permissionItems.push({
                    key: perms.value.indexOf(item),
                    id: item.id,
                    username: user_principal,
                    roles: roles.join(", ")
                })
            }
        }
        setPermissions(permissionItems);
        setLoadingPermissions(false);
    }

    const updateUserPrincipalName = (event, inputValue) => {
        setUserPrincipalName(inputValue);
    }

    const updateRole = (event, inputValue) => {
        setRole(inputValue);
    }

    const handleAddPermission = async () => {
        setShowAddDialog(false);
        setLoadingPermissions(true);
        await raas.addContainerPermission(currentContainer, userPrincipalName, role);
        await loadPermissions();
    };

    const handleDeletePermission = async (index) => {
        setShowDeleteDialog(false);
        setLoadingPermissions(true);
        await raas.deleteContainerPermissionById(currentContainer, selectedPermission.id);
        await loadPermissions();       
    };

    const handleCloseAddPermissionDialog = (event) => {
        setShowAddDialog(false);
    }

    const handleCloseDeletePermissionDialog = (event) => {
        setShowDeleteDialog(false);
    }

    const handleSave = async () => {
        // make API call to save the permissions
        try {
            const response = await fetch('/api/permissions', {
                method: 'POST',
                body: JSON.stringify(""),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch {
            console.log('');
        }
    };
    return (
        <>
            <CommandBar items={permissionsCommands} />
            {loadingPermissions && (
                <div>
                    <Spinner label="Loading permissions..." />
                </div>
            )}
            {<Stack {...stackProps}>
                {!loadingPermissions && permissions.length == 0 && (
                    <div>
                        <br />
                        No permissions available.
                        <br />Please refresh your authentication token as it may have expired or add a new set of permissions.
                    </div>
                )}
                {permissions.length != 0 &&
                    <DetailsList
                        items={permissions}
                        columns={columns}
                        setKey="key"
                        layoutMode={DetailsListLayoutMode.fixedColumns}
                    />
                }

                <Dialog
                    hidden={!showAddDialog}
                    onDismiss={handleCloseAddPermissionDialog}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: 'Add Permissions',
                    }}
                >
                    <TextField
                        label="User Name"
                        onChange={updateUserPrincipalName}
                    />
                    <TextField
                        label="Role"
                        onChange={updateRole}
                    />
                    <DialogFooter>
                        <PrimaryButton onClick={handleAddPermission} text="Save" />
                        <DefaultButton onClick={handleCloseAddPermissionDialog} text="Cancel" />
                    </DialogFooter>
                </Dialog>
                <Dialog
                    hidden={!showDeleteDialog}
                    onDismiss={handleCloseDeletePermissionDialog}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: 'Delete?',
                        subText: 'Are you sure you want to delete the permissions of this user?',
                    }}
                >
                    <DialogFooter>
                        <PrimaryButton onClick={handleDeletePermission} text="Delete" />
                        <DefaultButton onClick={handleCloseDeletePermissionDialog} text="Cancel" />
                    </DialogFooter>
                </Dialog>
            </Stack>}
        </>
    );
}

export default Permissions;