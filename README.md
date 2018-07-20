# surge rule-set sample
```
[Rule]
RULE-SET,apple.list,Proxy
RULE-SET,adblock.list,REJECT
RULE-SET,https://github.com/scomper/surge-list/raw/master/reject.list,REJECT
RULE-SET,blocked.list,Proxy
RULE-SET,netflix.list,Proxy
RULE-SET,cn.list,DIRECT
RULE-SET,LAN,DIRECT

GEOIP,CN,DIRECT
FINAL,Proxy,dns-failed
